import "server-only";
import type { ChannelHealth } from "@/db/schema";
import { AppError } from "@/server/errors";
import type { ChannelAdapter, ChannelRecord, ConnectResult, DownloadedMedia, NormalizedEvent, SendResult } from "../types";
import { DEFAULT_CAPABILITIES } from "../capabilities";
import { readVapiConfig } from "./config";

export const vapiAdapter: ChannelAdapter = {
  type: "phone_vapi",
  capabilities: () => DEFAULT_CAPABILITIES.phone_vapi,
  async validateAndConnect(_, input): Promise<ConnectResult> {
    return { ok: true, config: (input as Record<string, unknown>) ?? {} };
  },
  async healthCheck(channel: ChannelRecord): Promise<ChannelHealth> {
    const config = readVapiConfig(channel.config);
    return {
      checkedAt: new Date().toISOString(),
      checks: [
        {
          key: "vapi",
          status: "ok",
          detail: config.assistantId ? `Conectado al asistente ${config.assistantId}` : "Canal Vapi activo",
        },
      ],
    };
  },
  async handleWebhook(): Promise<NormalizedEvent[]> {
    return [];
  },
  async send(): Promise<SendResult> {
    return { externalId: `vapi-${crypto.randomUUID()}`, status: "delivered", sentAt: new Date() };
  },
  async downloadMedia(): Promise<DownloadedMedia> {
    throw new AppError(404, "vapi_no_media", "Las grabaciones de audio de Vapi se acceden directamente por su URL.");
  },
  async disconnect(): Promise<void> {},
};
