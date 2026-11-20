// Webhook processor for Evolution API v2.3.7 events.
// Normalizes inbound WhatsApp messages, statuses, and connection updates into the CRM pipeline.
// Answers at once and never calls the AI inside the webhook (spec [CAN-10]).
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, messages } from "@/db/schema";
import { ingestEvents, type IngestResult } from "@/server/inbound/ingest";
import { applyStatusUpdate } from "@/server/inbound/status";
import { recordPhoneEcho } from "@/server/channels/phone-echo";
import type { ChannelRecord, InboundMessageEvent } from "@/server/channels/types";
import { safeErrorMessage } from "@/server/redact";
import { getEvolutionConfig } from "@/lib/evolution/client";
import { timingSafeEqualStr } from "@/server/crypto";
import { phoneDigits } from "@/lib/meta/markets";

export type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  destination?: string;
  date_time?: string;
  server_url?: string;
  apikey?: string;
};

export type ProcessEvolutionResult = {
  status: 200 | 400 | 401 | 404;
  replyRunAt: Date | null;
  queuedNow: boolean;
};

/** Authenticates webhook request using API key header or body token. */
export function verifyEvolutionAuth(headers: Headers, payloadApiKey?: string): boolean {
  const { apiKey } = getEvolutionConfig();
  if (!apiKey) return true; // if not set in env, allow for development or internal network
  const headerKey = headers.get("apikey") || headers.get("x-api-key") || "";
  const candidate = headerKey || payloadApiKey || "";
  if (!candidate) return false;
  return timingSafeEqualStr(candidate, apiKey);
}

/** Finds the channel that owns this Evolution API instance. */
export async function findChannelForEvolutionInstance(instanceName: string): Promise<ChannelRecord | null> {
  const [match] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.type, "whatsapp"), eq(channels.connectionMode, "qr")));

  if (match) return match;

  // Fallback: look by channel name
  const [byName] = await db
    .select()
    .from(channels)
    .where(eq(channels.name, instanceName));

  return byName ?? null;
}

/** Extracts text content from a Baileys message object. */
export function extractMessageText(messageObj: Record<string, unknown> | null | undefined): string | null {
  if (!messageObj) return null;
  if (typeof messageObj.conversation === "string") return messageObj.conversation.trim();
  const ext = messageObj.extendedTextMessage as { text?: string } | undefined;
  if (typeof ext?.text === "string") return ext.text.trim();
  const img = messageObj.imageMessage as { caption?: string } | undefined;
  if (typeof img?.caption === "string") return img.caption.trim();
  const doc = messageObj.documentMessage as { caption?: string } | undefined;
  if (typeof doc?.caption === "string") return doc.caption.trim();
  const vid = messageObj.videoMessage as { caption?: string } | undefined;
  if (typeof vid?.caption === "string") return vid.caption.trim();
  return null;
}

/** Normalizes Evolution API messages.upsert into InboundMessageEvent. */
export function normalizeEvolutionMessage(
  channel: ChannelRecord,
  rawMsg: Record<string, unknown>,
): InboundMessageEvent | null {
  const key = rawMsg.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
  if (!key || !key.remoteJid || !key.id) return null;

  // Ignore group messages
  if (key.remoteJid.endsWith("@g.us")) return null;

  const text = extractMessageText(rawMsg.message as Record<string, unknown>);
  const pushName = typeof rawMsg.pushName === "string" ? rawMsg.pushName : null;
  const timestampSec = typeof rawMsg.messageTimestamp === "number" ? rawMsg.messageTimestamp : Math.floor(Date.now() / 1000);
  const receivedAt = new Date(timestampSec * 1000);

  return {
    kind: "inbound_message",
    externalId: key.id,
    sentAt: receivedAt,
    sender: {
      externalIds: [key.remoteJid],
      phone: phoneDigits(key.remoteJid),
      displayName: pushName,
    },
    contentType: "text",
    text,
    metadata: {
      source: "evolution",
      pushName,
      rawKey: key,
    },
  };
}

/** Processes an incoming webhook from Evolution API. */
export async function processEvolutionWebhook(
  instanceName: string,
  payload: EvolutionWebhookPayload,
  headers: Headers,
): Promise<ProcessEvolutionResult> {
  if (!verifyEvolutionAuth(headers, payload.apikey)) {
    return { status: 401, replyRunAt: null, queuedNow: false };
  }

  const channel = await findChannelForEvolutionInstance(instanceName);
  if (!channel) {
    // Channel not yet created or configured in CRM DB
    return { status: 200, replyRunAt: null, queuedNow: false };
  }

  const eventName = (payload.event || "").toLowerCase();
  const rawData = payload.data;
  const items = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];

  let replyRunAt: Date | null = null;
  const queuedNow = false;

  try {
    if (eventName === "messages.upsert") {
      for (const item of items) {
        const key = item.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
        if (!key || !key.remoteJid || !key.id) continue;

        if (key.fromMe) {
          // Outbound message: could be sent by CRM or directly from phone.
          // Check if already stored to avoid loop.
          const [existing] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(eq(messages.channelId, channel.id), eq(messages.externalId, key.id)));

          if (!existing) {
            // Echo from phone: store and pause AI
            const text = extractMessageText(item.message as Record<string, unknown>);
            if (text) {
              await recordPhoneEcho(channel, {
                externalIds: [key.id],
                recipient: { externalIds: [key.remoteJid] },
                contentType: "text",
                text,
                sentAt: new Date(),
              });
            }
          }
          continue;
        }

        // Inbound message from customer
        const inboundEvent = normalizeEvolutionMessage(channel, item);
        if (inboundEvent) {
          const res: IngestResult = await ingestEvents(channel, [inboundEvent], {
            raw: { source: "evolution", payload: item },
          });
          if (res.replyRunAt) {
            if (!replyRunAt || res.replyRunAt < replyRunAt) replyRunAt = res.replyRunAt;
          }
        }
      }
    } else if (eventName === "messages.update") {
      for (const item of items) {
        const key = item.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
        const update = item.update as { status?: number | string } | undefined;
        if (key?.id && update?.status) {
          let statusStr: "sent" | "delivered" | "read" | null = null;
          const s = String(update.status).toUpperCase();
          if (s === "3" || s.includes("DELIVERY") || s === "DELIVERED") statusStr = "delivered";
          else if (s === "4" || s === "5" || s.includes("READ") || s.includes("PLAYED")) statusStr = "read";
          else if (s === "2" || s.includes("SERVER_ACK") || s === "SENT") statusStr = "sent";

          if (statusStr) {
            await applyStatusUpdate(channel, {
              kind: "status_update",
              externalId: key.id,
              status: statusStr,
              at: new Date(),
            });
          }
        }
      }
    } else if (eventName === "connection.update") {
      // Update channel health
      const stateObj = rawData as { state?: string } | undefined;
      const state = (stateObj?.state || "").toLowerCase();
      const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "error";
      await db
        .update(channels)
        .set({ status, updatedAt: new Date() })
        .where(eq(channels.id, channel.id));
    }
  } catch (error) {
    console.error(`[evolution-webhook] Error al procesar evento ${eventName}: ${safeErrorMessage(error)}`);
  }

  return { status: 200, replyRunAt, queuedNow };
}
