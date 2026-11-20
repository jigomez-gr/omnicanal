import { describe, expect, it } from "vitest";
import { extractMessageText, normalizeEvolutionMessage, verifyEvolutionAuth } from "./webhook";
import type { ChannelRecord } from "../types";

describe("Evolution webhook processor", () => {
  it("verifies auth correctly", () => {
    const headers = new Headers();
    // When no env key is set, allows
    expect(verifyEvolutionAuth(headers)).toBe(true);
  });

  it("extracts text from various message formats", () => {
    expect(extractMessageText({ conversation: "Hola mundo" })).toBe("Hola mundo");
    expect(extractMessageText({ extendedTextMessage: { text: "Mensaje largo" } })).toBe("Mensaje largo");
    expect(extractMessageText({ imageMessage: { caption: "Foto con texto" } })).toBe("Foto con texto");
    expect(extractMessageText(null)).toBe(null);
  });

  it("normalizes evolution raw message to InboundMessageEvent", () => {
    const fakeChannel: ChannelRecord = {
      id: "ch-123",
      type: "whatsapp",
      name: "WhatsApp QR",
      status: "connected",
      isDemo: false,
      config: {},
      secretsEnc: null,
      activeAgentId: null,
      aiEnabled: true,
      offHoursAgentId: null,
      testMode: false,
      testAllowlist: [],
      replyMode: "auto",
      disclosureMessage: null,
      offHoursBehavior: "reply",
      lastHealth: null,
      lastHealthAt: null,
      lastInboundAt: null,
      connectionMode: "qr",
      phoneNumberId: "qr:34600111222",
      wabaId: null,
      metaAppId: null,
      metaBusinessId: null,
      isMetaTestNumber: false,
      displayPhoneNumber: "+34 600 111 222",
      verifiedName: null,
      qualityRating: null,
      nameStatus: null,
      codeVerificationStatus: null,
      messagingLimit: null,
      graphApiVersion: null,
      webhookStatus: null,
      registerAttempts: [],
      nameApprovedAt: null,
      paymentMethodConfirmedAt: null,
      tokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const raw = {
      key: {
        remoteJid: "34699999999@s.whatsapp.net",
        fromMe: false,
        id: "BAILEYS_MSG_999",
      },
      pushName: "Cliente Flamenco",
      message: {
        conversation: "¿Tenéis disponibilidad?",
      },
      messageTimestamp: 1732066800,
    };

    const event = normalizeEvolutionMessage(fakeChannel, raw);
    expect(event).not.toBeNull();
    expect(event?.externalId).toBe("BAILEYS_MSG_999");
    expect(event?.sender.externalIds).toEqual(["34699999999@s.whatsapp.net"]);
    expect(event?.sender.displayName).toBe("Cliente Flamenco");
    expect(event?.text).toBe("¿Tenéis disponibilidad?");
  });

  it("ignores group messages", () => {
    const fakeChannel = { id: "ch-123" } as unknown as ChannelRecord;
    const raw = {
      key: {
        remoteJid: "123456789-987654@g.us",
        fromMe: false,
        id: "GROUP_MSG",
      },
      message: { conversation: "Hola grupo" },
    };
    expect(normalizeEvolutionMessage(fakeChannel, raw)).toBeNull();
  });
});
