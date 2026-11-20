import "server-only";
import type { ChannelHealth } from "@/db/schema";
import { AppError } from "@/server/errors";
import type { ChannelAdapter, ChannelRecord, ConnectResult, DownloadedMedia, NormalizedEvent, OutboundMessage, SendResult } from "../types";
import { DEFAULT_CAPABILITIES } from "../capabilities";
import { readZadarmaConfig, readZadarmaSecrets } from "./config";
import { sendZadarmaSms } from "./client";

export const zadarmaAdapter: ChannelAdapter = {
  type: "sms_zadarma",
  capabilities: () => DEFAULT_CAPABILITIES.sms_zadarma,
  async validateAndConnect(_, input): Promise<ConnectResult> {
    return { ok: true, config: (input as Record<string, unknown>) ?? {} };
  },
  async healthCheck(channel: ChannelRecord): Promise<ChannelHealth> {
    const config = readZadarmaConfig(channel.config);
    return {
      checkedAt: new Date().toISOString(),
      checks: [
        {
          key: "zadarma",
          status: "ok",
          detail: `Remitente SMS: ${config.senderId || "Teamsale"}`,
        },
      ],
    };
  },
  async handleWebhook(): Promise<NormalizedEvent[]> {
    return [];
  },
  async send(channel: ChannelRecord, message: OutboundMessage): Promise<SendResult> {
    const secrets = readZadarmaSecrets(channel);
    const config = readZadarmaConfig(channel.config);

    if (!secrets || channel.isDemo || !message.recipient.phone) {
      return {
        externalId: `sms-${crypto.randomUUID()}`,
        status: "delivered",
        sentAt: new Date(),
      };
    }

    const res = await sendZadarmaSms({
      apiKey: secrets.apiKey,
      apiSecret: secrets.apiSecret,
      sender: config.senderId,
      number: message.recipient.phone,
      message: message.text ?? "",
    });

    if (res.status === "success") {
      return {
        externalId: `sms-${Date.now()}`,
        status: "delivered",
        sentAt: new Date(),
      };
    }

    return {
      externalId: null,
      status: "queued",
      sentAt: new Date(),
    };
  },
  async downloadMedia(): Promise<DownloadedMedia> {
    throw new AppError(404, "zadarma_no_media", "Los SMS no contienen archivos adjuntos.");
  },
  async disconnect(): Promise<void> {},
};
