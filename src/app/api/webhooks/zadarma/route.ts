import { eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, contacts, conversations, messages } from "@/db/schema";
import { publishConversationEvent } from "@/server/realtime/events";
import { ensureZadarmaChannel } from "@/data/call-sync";

/**
 * Webhook receiver for Zadarma SMS ([ZAD-01]).
 * Handles incoming SMS notifications and webhook verification echo.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const zdEcho = searchParams.get("zd_echo");
  if (zdEcho) {
    // Zadarma sends zd_echo verification challenge upon webhook setup
    return new Response(zdEcho, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Zadarma Webhook OK", { status: 200 });
}

export async function POST(req: Request) {
  try {
    let payload: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
    }

    // Zadarma webhook echo verification in POST
    if (typeof payload.zd_echo === "string") {
      return new Response(payload.zd_echo, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const callerNumber =
      typeof payload.caller_id === "string"
        ? payload.caller_id
        : typeof payload.from === "string"
          ? payload.from
          : typeof payload.number === "string"
            ? payload.number
            : null;
    const smsText =
      typeof payload.text === "string"
        ? payload.text
        : typeof payload.message === "string"
          ? payload.message
          : null;
    const senderId = typeof payload.to === "string" ? payload.to : "Zadarma";

    if (callerNumber && smsText) {
      // Find or ensure active Zadarma channel
      let [channel] = await db.select().from(channels).where(eq(channels.type, "sms_zadarma")).limit(1);
      if (!channel) {
        channel = await ensureZadarmaChannel();
      }

      // 1. Match or create contact
      let [contact] = await db.select().from(contacts).where(eq(contacts.phone, callerNumber));
      if (!contact) {
        const [newContact] = await db
          .insert(contacts)
          .values({
            id: crypto.randomUUID(),
            name: `Contacto SMS ${callerNumber}`,
            phone: callerNumber,
          })
          .returning();
        contact = newContact;
      }

      // 2. Create or find conversation
      const channelId = channel ? channel.id : null;
      const now = new Date();
      const conversationId = crypto.randomUUID();

      const [conversation] = await db
        .insert(conversations)
        .values({
          id: conversationId,
          channelId,
          contactId: contact ? contact.id : null,
          externalThreadId: `sms_${Date.now()}`,
          status: "open",
          unreadCount: 1,
          lastInboundAt: now,
          lastMessageAt: now,
          metadata: {
            phone: callerNumber,
            senderId,
            channelType: "sms_zadarma",
          },
        })
        .returning();

      // 3. Insert inbound message
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        channelId,
        direction: "inbound",
        senderType: "contact",
        text: smsText,
        status: "delivered",
        sentAt: now,
        createdAt: now,
      });

      await publishConversationEvent({ type: "conversation.updated", conversationId: conversation.id, channelId: channel?.id ?? "", change: "created" });
    }

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}
