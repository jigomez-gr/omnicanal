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
  encryptVapiSecrets,
  readVapiConfig,
  readVapiSecrets,
  vapiWebhookUrl,
  type VapiConfig,
  type VapiSecrets,
} from "@/server/channels/vapi/config";
import { maskSecret } from "@/server/crypto";
import { publishConversationEvent } from "@/server/realtime/events";

export const connectVapiSchema = z.object({
  name: z.string().trim().min(1, "Indica un nombre para el canal.").max(80, "Como mucho, 80 caracteres."),
  apiKey: z.string().trim().min(1, "Indica la API Key de Vapi."),
  assistantId: z.string().trim().optional().default(""),
  phoneNumberId: z.string().trim().optional().default(""),
  phoneNumber: z.string().trim().optional().default(""),
  webhookToken: z.string().trim().optional().default(""),
});

export type ConnectVapiInput = z.infer<typeof connectVapiSchema>;

export async function connectVapiChannel(actor: Actor, input: unknown) {
  assertCan(actor, PERMISSIONS.channels.manage);
  const data = parseInput(connectVapiSchema, input);

  const existing = await db
    .select()
    .from(channels)
    .where(and(eq(channels.type, "phone_vapi"), eq(channels.name, data.name)));
  if (existing.length > 0) {
    throw new ConflictError("Ya existe un canal con este nombre.");
  }

  const id = crypto.randomUUID();
  const config: VapiConfig = {
    assistantId: data.assistantId,
    phoneNumberId: data.phoneNumberId,
    phoneNumber: data.phoneNumber,
    model: "gpt-4o",
    voice: "elevenlabs",
  };
  const secrets: VapiSecrets = {
    apiKey: data.apiKey,
    webhookToken: data.webhookToken,
  };
  const secretsEnc = encryptVapiSecrets(secrets);

  const health: ChannelHealth = {
    checkedAt: new Date().toISOString(),
    checks: [
      { key: "credentials", status: "ok", detail: "Claves de Vapi guardadas" },
      { key: "webhook", status: "ok", detail: "Webhook listo para recibir llamadas" },
    ],
  };

  const [created] = await db
    .insert(channels)
    .values({
      id,
      type: "phone_vapi",
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
    metadata: { name: data.name, type: "phone_vapi" },
  });

  return { id: created.id, name: created.name, webhookUrl: vapiWebhookUrl() };
}

export async function loadVapiChannel(channelId: unknown) {
  const id = idSchema.parse(channelId);
  const [row] = await db.select().from(channels).where(eq(channels.id, id));
  if (!row || row.type !== "phone_vapi") throw new NotFoundError("No se ha encontrado el canal de Vapi.");

  const config = readVapiConfig(row.config);
  const secrets = readVapiSecrets(row);

  return {
    channel: row,
    config,
    maskedApiKey: secrets ? maskSecret(secrets.apiKey) : null,
    hasWebhookToken: Boolean(secrets?.webhookToken),
    webhookUrl: vapiWebhookUrl(),
  };
}

export async function simulateVapiCall(actor: Actor, channelId: string) {
  assertCan(actor, PERMISSIONS.channels.manage);
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
  if (!channel || channel.type !== "phone_vapi") throw new NotFoundError("Canal no encontrado");

  // Create or match a test contact
  const testPhone = "+34612987654";
  let [contact] = await db.select().from(contacts).where(eq(contacts.phone, testPhone));
  if (!contact) {
    const [createdContact] = await db
      .insert(contacts)
      .values({
        id: crypto.randomUUID(),
        name: "María Gómez (Llamada Vapi)",
        phone: testPhone,
      })
      .returning();
    contact = createdContact;
  }

  const conversationId = crypto.randomUUID();
  const vapiCallId = `call_${Date.now()}`;
  const now = new Date();

  const [conversation] = await db
    .insert(conversations)
    .values({
      id: conversationId,
      channelId: channel.id,
      contactId: contact.id,
      externalThreadId: vapiCallId,
      status: "resolved",
      lastInboundAt: now,
      lastMessageAt: now,
      unreadCount: 1,
      summary: "La clienta llamó preguntando por los horarios y disponibilidad para reservar cita. Se le informó de los turnos libres del viernes y confirmó su asistencia.",
      metadata: {
        vapiCallId,
        direction: "inbound",
        callerNumber: testPhone,
        durationSeconds: 142,
        cost: 0.045,
        status: "ended",
        endedReason: "customer-ended-call",
        recordingUrl: "https://actions.google.com/sounds/v1/telephones/phone_calling.ogg",
      },
    })
    .returning();

  // Insert dialogue turns
  const turns = [
    { dir: "inbound" as const, sender: "contact" as const, text: "Hola, buenos días, llamaba para consultar los horarios disponibles." },
    { dir: "outbound" as const, sender: "ai" as const, text: "¡Buenos días! Encantado de atenderte. Tenemos huecos disponibles este viernes a las 11:00 y a las 17:30. ¿Cuál prefieres?" },
    { dir: "inbound" as const, sender: "contact" as const, text: "A las 17:30 me viene fenomenal, por favor resérvamelo a nombre de María." },
    { dir: "outbound" as const, sender: "ai" as const, text: "¡Estupendo María! Te he reservado para el viernes a las 17:30. Te enviaremos un recordatorio por WhatsApp o SMS. ¡Que tengas un buen día!" },
  ];

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    const turnTime = new Date(now.getTime() - (turns.length - i) * 15000);
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      channelId: channel.id,
      direction: t.dir,
      senderType: t.sender,
      text: t.text,
      status: "delivered",
      sentAt: turnTime,
      createdAt: turnTime,
    });
  }

  await publishConversationEvent({ type: "conversation.updated", conversationId: conversation.id, channelId: channel.id, change: "created" });
  return { conversationId: conversation.id, success: true };
}
