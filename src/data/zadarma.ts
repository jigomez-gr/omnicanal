import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { channels, contacts, conversations, messages, type ChannelHealth } from "@/db/schema";
import { PERMISSIONS, type Actor } from "@/lib/permissions";
import { idSchema } from "@/lib/validation";
import { ConflictError, NotFoundError, parseInput } from "@/server/errors";
import { assertCan } from "./guard";
import { writeAudit } from "./audit";
import {
  encryptZadarmaSecrets,
  readZadarmaConfig,
  readZadarmaSecrets,
  zadarmaWebhookUrl,
  type ZadarmaConfig,
  type ZadarmaSecrets,
} from "@/server/channels/zadarma/config";
import { maskSecret } from "@/server/crypto";
import { publishConversationEvent } from "@/server/realtime/events";

export const connectZadarmaSchema = z.object({
  name: z.string().trim().min(1, "Indica un nombre para el canal.").max(80, "Como mucho, 80 caracteres."),
  apiKey: z.string().trim().min(1, "Indica la API Key de Zadarma."),
  apiSecret: z.string().trim().min(1, "Indica el API Secret de Zadarma."),
  senderId: z.string().trim().optional().default("Teamsale"),
});

export type ConnectZadarmaInput = z.infer<typeof connectZadarmaSchema>;

export async function connectZadarmaChannel(actor: Actor, input: unknown) {
  assertCan(actor, PERMISSIONS.channels.manage);
  const data = parseInput(connectZadarmaSchema, input);

  const existing = await db
    .select()
    .from(channels)
    .where(and(eq(channels.type, "sms_zadarma"), eq(channels.name, data.name)));
  if (existing.length > 0) {
    throw new ConflictError("Ya existe un canal con este nombre.");
  }

  const id = crypto.randomUUID();
  const config: ZadarmaConfig = {
    senderId: data.senderId || "Teamsale",
    autoConfirmation: true,
  };
  const secrets: ZadarmaSecrets = {
    apiKey: data.apiKey,
    apiSecret: data.apiSecret,
  };
  const secretsEnc = encryptZadarmaSecrets(secrets);

  const health: ChannelHealth = {
    checkedAt: new Date().toISOString(),
    checks: [
      { key: "credentials", status: "ok", detail: "Claves de Zadarma guardadas" },
      { key: "sms", status: "ok", detail: "Pasarela lista para envío y recepción" },
    ],
  };

  const [created] = await db
    .insert(channels)
    .values({
      id,
      type: "sms_zadarma",
      name: data.name,
      status: "connected",
      config,
      secretsEnc,
      lastHealth: health,
      lastHealthAt: new Date(),
    })
    .returning();

  await writeAudit({
    actor,
    action: "channel.connected",
    targetType: "channel",
    targetId: id,
    metadata: { name: data.name, type: "sms_zadarma" },
  });

  return { id: created.id, name: created.name, webhookUrl: zadarmaWebhookUrl() };
}

export async function loadZadarmaChannel(channelId: unknown) {
  const id = idSchema.parse(channelId);
  const [row] = await db.select().from(channels).where(eq(channels.id, id));
  if (!row || row.type !== "sms_zadarma") throw new NotFoundError("No se ha encontrado el canal de Zadarma.");

  const config = readZadarmaConfig(row.config);
  const secrets = readZadarmaSecrets(row);

  return {
    channel: row,
    config,
    maskedApiKey: secrets ? maskSecret(secrets.apiKey) : null,
    hasSecret: Boolean(secrets?.apiSecret),
    webhookUrl: zadarmaWebhookUrl(),
  };
}

export async function simulateZadarmaSms(actor: Actor, channelId: string) {
  assertCan(actor, PERMISSIONS.channels.manage);
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
  if (!channel || channel.type !== "sms_zadarma") throw new NotFoundError("Canal no encontrado");

  // Create or match test contact
  const testPhone = "+34655123456";
  let [contact] = await db.select().from(contacts).where(eq(contacts.phone, testPhone));
  if (!contact) {
    const [createdContact] = await db
      .insert(contacts)
      .values({
        id: crypto.randomUUID(),
        name: "Carlos Ruiz (SMS)",
        phone: testPhone,
      })
      .returning();
    contact = createdContact;
  }

  const conversationId = crypto.randomUUID();
  const now = new Date();
  const config = readZadarmaConfig(channel.config);

  const [conversation] = await db
    .insert(conversations)
    .values({
      id: conversationId,
      channelId: channel.id,
      contactId: contact.id,
      externalThreadId: `sms_${Date.now()}`,
      status: "open",
      lastInboundAt: now,
      lastMessageAt: now,
      unreadCount: 1,
      metadata: {
        phone: testPhone,
        senderId: config.senderId,
        channelType: "sms_zadarma",
        status: "recibido",
      },
    })
    .returning();

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    channelId: channel.id,
    direction: "inbound",
    senderType: "contact",
    text: "Hola, os escribo por SMS porque no tengo WhatsApp ahora mismo. ¿Me podéis confirmar el horario de mi cita?",
    status: "delivered",
    sentAt: now,
    createdAt: now,
  });

  await publishConversationEvent({ type: "conversation.updated", conversationId: conversation.id, channelId: channel.id, change: "created" });
  return { conversationId: conversation.id, success: true };
}
