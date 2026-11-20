// Vapi (Voice AI Telephony) channel configuration and secrets.
import "server-only";
import { z } from "zod";
import type { ChannelRecord } from "@/server/channels/types";
import { encryptChannelSecrets, readChannelSecrets } from "@/server/channels/secrets";
import { appUrl } from "@/server/app-url";

export const vapiConfigSchema = z
  .object({
    assistantId: z.string().optional().default(""),
    phoneNumberId: z.string().optional().default(""),
    phoneNumber: z.string().optional().default(""),
    model: z.string().optional().default("gpt-4o"),
    voice: z.string().optional().default("elevenlabs"),
  })
  .passthrough();

export type VapiConfig = z.infer<typeof vapiConfigSchema>;

export const vapiSecretsSchema = z.object({
  apiKey: z.string().min(1, "Indica la API Key de Vapi."),
  webhookToken: z.string().optional().default(""),
});

export type VapiSecrets = z.infer<typeof vapiSecretsSchema>;

export function readVapiConfig(config: Record<string, unknown>): VapiConfig {
  const parsed = vapiConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : vapiConfigSchema.parse({});
}

export function readVapiSecrets(channel: Pick<ChannelRecord, "secretsEnc">): VapiSecrets | null {
  return readChannelSecrets(channel, vapiSecretsSchema);
}

export function encryptVapiSecrets(secrets: VapiSecrets): string {
  return encryptChannelSecrets(secrets);
}

export function vapiWebhookUrl(): string {
  return appUrl("/api/webhooks/vapi");
}
