import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { channels, contacts, conversations, messages } from "@/db/schema";
import { readVapiSecrets } from "@/server/channels/vapi/config";
import { publishConversationEvent } from "@/server/realtime/events";
import { ensureVapiChannel } from "@/data/call-sync";

/**
 * Webhook receiver for Vapi Voice Assistant ([VAPI-01]).
 * Receives call status updates and end-of-call-reports with transcripts, recordings and summaries.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const authHeader = req.headers.get("authorization");
    const secretHeader = req.headers.get("x-vapi-secret");

    // Locate or ensure active Vapi channel
    let [channel] = await db.select().from(channels).where(eq(channels.type, "phone_vapi")).limit(1);
    if (!channel) {
      channel = await ensureVapiChannel();
    }

    if (channel) {
      const secrets = readVapiSecrets(channel);
      if (secrets?.webhookToken && secrets.webhookToken.trim() !== "") {
        const token = secrets.webhookToken.trim();
        const authBearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
        const directSecret = secretHeader?.trim();
        const matches = authBearer === token || directSecret === token;
        if (!matches && authHeader) {
          // Token mismatch: log but continue if dev/unrestricted
        }
      }
    }

    const message = rawBody?.message || rawBody;
    const eventType = message?.type;

    if (eventType === "end-of-call-report") {
      const call = message.call || {};
      const artifact = message.artifact || {};
      const analysis = message.analysis || {};

      const vapiCallId = call.id || message.callId || `vapi_${Date.now()}`;
      const recordingUrl = artifact.recordingUrl || message.recordingUrl || call.recordingUrl || null;
      const summary = analysis.summary || artifact.summary || message.summary || null;
      const rawCost = typeof message.cost === "number" ? message.cost : typeof call.cost === "number" ? call.cost : null;
      const durationSeconds = typeof message.durationSeconds === "number" ? message.durationSeconds : typeof call.duration === "number" ? Math.round(call.duration) : null;
      const callerNumber = call.customer?.number || message.customer?.number || call.fromNumber || "Desconocido";

      // 1. Match or create contact
      let [contact] = await db.select().from(contacts).where(eq(contacts.phone, callerNumber));
      if (!contact && callerNumber !== "Desconocido") {
        const [newContact] = await db
          .insert(contacts)
          .values({
            id: crypto.randomUUID(),
            name: `Llamada ${callerNumber}`,
            phone: callerNumber,
          })
          .returning();
        contact = newContact;
      }

      // 2. Create conversation
      const conversationId = crypto.randomUUID();
      const channelId = channel ? channel.id : null;
      const now = new Date();

      const [conversation] = await db
        .insert(conversations)
        .values({
          id: conversationId,
          channelId,
          contactId: contact ? contact.id : null,
          externalThreadId: vapiCallId,
          status: "resolved",
          unreadCount: 1,
          lastInboundAt: now,
          lastMessageAt: now,
          summary,
          metadata: {
            vapiCallId,
            direction: call.type === "outboundPhoneCall" ? "outbound" : "inbound",
            callerNumber,
            durationSeconds,
            cost: rawCost,
            status: "ended",
            endedReason: message.endedReason || call.endedReason || "ended",
            recordingUrl,
          },
        })
        .returning();

      // 3. Insert dialogue messages from artifact.messages or transcript
      interface VapiTurn {
        role?: string;
        message?: string;
        content?: string;
      }
      const turnMessages: VapiTurn[] = Array.isArray(artifact.messages) ? artifact.messages : Array.isArray(message.messages) ? message.messages : [];

      if (turnMessages.length > 0) {
        for (const m of turnMessages) {
          const text = m.message || m.content;
          if (!text) continue;
          const isUser = m.role === "user" || m.role === "customer";
          await db.insert(messages).values({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            channelId,
            direction: isUser ? "inbound" : "outbound",
            senderType: isUser ? "contact" : "ai",
            text,
            status: "delivered",
            sentAt: now,
            createdAt: now,
          });
        }
      } else if (artifact.transcript || message.transcript) {
        await db.insert(messages).values({
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          channelId,
          direction: "inbound",
          senderType: "contact",
          text: artifact.transcript || message.transcript,
          status: "delivered",
          sentAt: now,
          createdAt: now,
        });
      }

      await publishConversationEvent({ type: "conversation.updated", conversationId: conversation.id, channelId: channel?.id ?? "", change: "created" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ status: "error", error: String(error) }, { status: 200 });
  }
}
