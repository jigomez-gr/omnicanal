import "server-only";
import { and, eq, ilike, notExists, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  calls,
  channels,
  contacts,
  conversations,
  messages,
  vapiSettings,
  zadarmaSmsRespuesta,
} from "@/db/schema";
import { cleanSpanishText } from "@/lib/vapi/client";
import { publishConversationEvent } from "@/server/realtime/events";

/**
 * Ensures a channel of type 'phone_vapi' exists so conversations are never orphaned.
 */
export async function ensureVapiChannel(): Promise<typeof channels.$inferSelect> {
  const [existing] = await db.select().from(channels).where(eq(channels.type, "phone_vapi")).limit(1);
  if (existing) return existing;

  const [cfg] = await db.select().from(vapiSettings).limit(1);
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(channels)
    .values({
      id,
      name: "Llamadas (Vapi)",
      type: "phone_vapi",
      status: "connected",
      config: {
        assistantId: cfg?.vapiAssistantId || "",
        phoneNumberId: cfg?.vapiPhoneNumberId || "",
      },
      lastHealth: {
        checkedAt: new Date().toISOString(),
        checks: [{ key: "vapi", status: "ok", detail: "Canal automático de llamadas activo" }],
      },
      lastHealthAt: new Date(),
    })
    .returning();

  return created;
}

/**
 * Ensures a channel of type 'sms_zadarma' exists.
 */
export async function ensureZadarmaChannel(): Promise<typeof channels.$inferSelect> {
  const [existing] = await db.select().from(channels).where(eq(channels.type, "sms_zadarma")).limit(1);
  if (existing) return existing;

  const [cfg] = await db.select().from(vapiSettings).limit(1);
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(channels)
    .values({
      id,
      name: "SMS (Zadarma)",
      type: "sms_zadarma",
      status: "connected",
      config: {
        senderId: cfg?.zadarmaSmsCallerId || "Soniquete",
      },
      lastHealth: {
        checkedAt: new Date().toISOString(),
        checks: [{ key: "zadarma", status: "ok", detail: "Canal automático SMS activo" }],
      },
      lastHealthAt: new Date(),
    })
    .returning();

  return created;
}

/**
 * Syncs a record from the 'calls' table into 'conversations' and 'messages'.
 */
export async function syncCallToConversation(call: typeof calls.$inferSelect) {
  if (!call.vapiCallId) return null;

  const channel = await ensureVapiChannel();
  const phone = call.phoneNumber || "+34919933764";

  // Find or create contact
  let [contact] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
  if (!contact) {
    const [newContact] = await db
      .insert(contacts)
      .values({
        id: crypto.randomUUID(),
        name: call.callerName || `Contacto ${phone}`,
        phone,
      })
      .returning();
    contact = newContact;
  } else if (call.callerName && (!contact.name || contact.name.startsWith("Llamada ") || contact.name.startsWith("Contacto "))) {
    await db.update(contacts).set({ name: call.callerName }).where(eq(contacts.id, contact.id));
  }

  const [existingConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.externalThreadId, call.vapiCallId))
    .limit(1);

  const now = call.startedAt || call.createdAt || new Date();
  const metadata = {
    callId: call.id,
    vapiCallId: call.vapiCallId,
    direction: call.direction,
    durationSeconds: call.durationSeconds,
    cost: call.costCents ? call.costCents / 100 : 0,
    recordingUrl: call.recordingUrl,
    callerNumber: phone,
    callerName: call.callerName,
    status: call.status,
  };

  if (existingConv) {
    await db
      .update(conversations)
      .set({
        summary: cleanSpanishText(call.summary || existingConv.summary),
        metadata: {
          ...(existingConv.metadata || {}),
          ...metadata,
        },
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, existingConv.id));

    // Limpiar mensajes erróneos de sistema o herramientas que se hayan podido colar
    await db
      .delete(messages)
      .where(
        and(
          eq(messages.conversationId, existingConv.id),
          or(
            ilike(messages.text, "Eres Luc%"),
            ilike(messages.text, "System:%"),
            ilike(messages.text, "Sistema:%"),
            ilike(messages.text, "Herramienta:%"),
          ),
        ),
      )
      .catch(() => {});

    // Reparar acentos y caracteres corruptos en mensajes existentes
    const oldMsgs = await db
      .select({ id: messages.id, text: messages.text })
      .from(messages)
      .where(eq(messages.conversationId, existingConv.id));

    for (const m of oldMsgs) {
      const cleaned = cleanSpanishText(m.text);
      if (cleaned !== m.text) {
        await db.update(messages).set({ text: cleaned }).where(eq(messages.id, m.id)).catch(() => {});
      }
    }

    return existingConv.id;
  }

  const convId = crypto.randomUUID();
  const [conv] = await db
    .insert(conversations)
    .values({
      id: convId,
      channelId: channel.id,
      contactId: contact ? contact.id : null,
      externalThreadId: call.vapiCallId,
      status: "resolved",
      lastInboundAt: now,
      lastMessageAt: now,
      summary: cleanSpanishText(call.summary || `Llamada ${call.direction === "inbound" ? "entrante" : "saliente"} (${call.durationSeconds}s)`),
      metadata,
    })
    .returning();

  // Create messages from transcript
  if (call.transcript && call.transcript.trim()) {
    const lines = call.transcript.split("\n").map((l) => l.trim()).filter(Boolean);
    let msgTime = new Date(now.getTime() - lines.length * 10000);

    for (const rawLine of lines) {
      const line = cleanSpanishText(rawLine);
      // Omitir líneas de sistema, prompts o herramientas internas
      if (
        line.toLowerCase().startsWith("system:") ||
        line.toLowerCase().startsWith("sistema:") ||
        line.toLowerCase().startsWith("eres lucía") ||
        line.toLowerCase().startsWith("eres lucia") ||
        line.toLowerCase().startsWith("herramienta:") ||
        line.toLowerCase().startsWith("tool:")
      ) {
        continue;
      }

      let isBot = false;
      let text = line;
      if (
        line.toLowerCase().startsWith("asistente") ||
        line.toLowerCase().startsWith("lucía") ||
        line.toLowerCase().startsWith("bot") ||
        line.toLowerCase().startsWith("ai")
      ) {
        isBot = true;
        text = line.replace(/^[^:]+:\s*/i, "");
      } else if (
        line.toLowerCase().startsWith("cliente") ||
        line.toLowerCase().startsWith("interlocutor") ||
        line.toLowerCase().startsWith("usuario") ||
        line.toLowerCase().startsWith("user")
      ) {
        isBot = false;
        text = line.replace(/^[^:]+:\s*/i, "");
      } else if (call.direction === "outbound") {
        isBot = true;
      }

      text = cleanSpanishText(text);

      await db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId: conv.id,
        channelId: channel.id,
        direction: isBot ? "outbound" : "inbound",
        senderType: isBot ? "ai" : "contact",
        text,
        status: "delivered",
        sentAt: msgTime,
        createdAt: msgTime,
      });

      msgTime = new Date(msgTime.getTime() + 10000);
    }
  } else {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: conv.id,
      channelId: channel.id,
      direction: call.direction === "inbound" ? "inbound" : "outbound",
      senderType: call.direction === "inbound" ? "contact" : "ai",
      text: call.summary || `Llamada ${call.direction === "inbound" ? "entrante" : "saliente"} (${call.durationSeconds}s)`,
      status: "delivered",
      sentAt: now,
      createdAt: now,
    });
  }

  await publishConversationEvent({
    type: "conversation.updated",
    conversationId: conv.id,
    channelId: channel.id,
    change: "created",
  });

  return conv.id;
}

/**
 * Syncs a record from the 'zadarma_sms_respuesta' table into 'conversations' and 'messages'.
 */
export async function syncSmsToConversation(sms: typeof zadarmaSmsRespuesta.$inferSelect) {
  const channel = await ensureZadarmaChannel();
  const phone = sms.toPhone;

  let [contact] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
  if (!contact) {
    const [newContact] = await db
      .insert(contacts)
      .values({
        id: crypto.randomUUID(),
        name: `Contacto SMS ${phone}`,
        phone,
      })
      .returning();
    contact = newContact;
  }

  const threadId = `sms_${sms.id}`;
  const [existingConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.externalThreadId, threadId))
    .limit(1);

  if (existingConv) return existingConv.id;

  const now = sms.createdAt || new Date();
  const convId = crypto.randomUUID();

  const [conv] = await db
    .insert(conversations)
    .values({
      id: convId,
      channelId: channel.id,
      contactId: contact ? contact.id : null,
      externalThreadId: threadId,
      status: "resolved",
      lastInboundAt: now,
      lastMessageAt: now,
      summary: `SMS enviado a ${phone}: ${sms.message.slice(0, 80)}`,
      metadata: {
        phone,
        senderId: sms.callerId || "Soniquete",
        channelType: "sms_zadarma",
        status: sms.status,
      },
    })
    .returning();

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    conversationId: conv.id,
    channelId: channel.id,
    direction: "outbound",
    senderType: "human",
    text: sms.message,
    status: sms.status === "success" ? "delivered" : "failed",
    sentAt: now,
    createdAt: now,
  });

  await publishConversationEvent({
    type: "conversation.updated",
    conversationId: conv.id,
    channelId: channel.id,
    change: "created",
  });

  return conv.id;
}

/**
 * Syncs all unmapped calls and SMS records into conversations.
 * Runs in background or upon viewing the inbox.
 */
export async function syncPendingCallsAndSmsToConversations() {
  try {
    const unmappedCalls = await db
      .select()
      .from(calls)
      .where(
        notExists(
          db.select().from(conversations).where(eq(conversations.externalThreadId, calls.vapiCallId)),
        ),
      )
      .limit(50);

    for (const call of unmappedCalls) {
      await syncCallToConversation(call);
    }

    // Actualizar también metadatos de las llamadas existentes recientes (para asegurar callId y grabaciones actualizadas)
    const recentCalls = await db.select().from(calls).orderBy(sql`${calls.createdAt} desc`).limit(20);
    for (const call of recentCalls) {
      await syncCallToConversation(call);
    }

    const unmappedSms = await db
      .select()
      .from(zadarmaSmsRespuesta)
      .where(
        notExists(
          db
            .select()
            .from(conversations)
            .where(eq(conversations.externalThreadId, sql`concat('sms_', ${zadarmaSmsRespuesta.id})`)),
        ),
      )
      .limit(50);

    for (const sms of unmappedSms) {
      await syncSmsToConversation(sms);
    }
  } catch (_e) {
    // Non-blocking: fail quietly if schema is in migration or offline
  }
}
