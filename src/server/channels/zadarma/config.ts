// Zadarma (SMS gateway) channel configuration and secrets.
import "server-only";
import { z } from "zod";
import type { ChannelRecord } from "@/server/channels/types";
import { encryptChannelSecrets, readChannelSecrets } from "@/server/channels/secrets";
import { appUrl } from "@/server/app-url";

export const zadarmaConfigSchema = z
  .object({
    senderId: z.string().optional().default("Teamsale"),
    autoConfirmation: z.boolean().optional().default(true),
  })
  .passthrough();

export type ZadarmaConfig = z.infer<typeof zadarmaConfigSchema>;

export const zadarmaSecretsSchema = z.object({
  apiKey: z.string().min(1, "Indica la API Key de Zadarma."),
  apiSecret: z.string().min(1, "Indica el API Secret de Zadarma."),
});

export type ZadarmaSecrets = z.infer<typeof zadarmaSecretsSchema>;

export function readZadarmaConfig(config: Record<string, unknown>): ZadarmaConfig {
  const parsed = zadarmaConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : zadarmaConfigSchema.parse({});
}

export function readZadarmaSecrets(channel: Pick<ChannelRecord, "secretsEnc">): ZadarmaSecrets | null {
  return readChannelSecrets(channel, zadarmaSecretsSchema);
}

export function encryptZadarmaSecrets(secrets: ZadarmaSecrets): string {
  return encryptChannelSecrets(secrets);
}

export function zadarmaWebhookUrl(): string {
  return appUrl("/api/webhooks/zadarma");
}
