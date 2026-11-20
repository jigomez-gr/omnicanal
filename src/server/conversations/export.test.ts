import { describe, expect, it } from "vitest";
import type { ConversationDetail, ConversationListItem } from "@/data/conversations";
import type { MessageItem } from "@/data/messages";
import {
  cleanSafeFilename,
  generateConversationCsv,
  generateConversationListCsv,
  generateConversationListPdf,
  generateConversationListXlsx,
  generateConversationPdf,
  generateConversationXlsx,
  generateConversationZip,
} from "./export";

describe("Conversation and list export utilities", () => {
  const dummyListItems: ConversationListItem[] = [
    {
      id: "conv-1",
      channel: { id: "ch-1", name: "Recepción", type: "whatsapp" },
      contact: { id: "ct-1", name: "María Gómez" },
      status: "open",
      aiMode: "ai",
      aiPausedUntil: null,
      pauseReason: null,
      assignedUser: null,
      labels: ["consulta"],
      unreadCount: 2,
      lastMessageAt: new Date("2026-10-30T08:41:12Z"),
      createdAt: new Date("2026-10-30T08:00:00Z"),
      lastMessage: {
        preview: "Hola, me gustaría información",
        contentType: "text",
        direction: "inbound",
        senderType: "contact",
        createdAt: new Date("2026-10-30T08:41:12Z"),
      },
      urgent: false,
    },
  ];

  const dummyConversation: ConversationDetail = {
    id: "conv-1",
    channel: {
      id: "ch-1",
      name: "Recepción",
      type: "whatsapp",
      status: "active",
      capabilities: { audio: true, images: true, documents: true, templates: true, window24h: true, typing: true, readReceipts: true, html: false, drafts: false },
      isDemo: false,
    },
    contact: { id: "ct-1", name: "María Gómez", phone: "+34600111222", email: "maria@example.com" },
    status: "open",
    aiMode: "ai",
    aiPausedUntil: null,
    pauseReason: null,
    assignedUser: null,
    labels: ["consulta"],
    unreadCount: 0,
    lastMessageAt: new Date("2026-10-30T08:41:12Z"),
    createdAt: new Date("2026-10-30T08:00:00Z"),
    agent: null,
    agentOverride: null,
    openHandoff: null,
    window: null,
    summary: null,
    lastInboundAt: null,
  };

  const dummyMessages: MessageItem[] = [
    {
      id: "msg-1",
      direction: "inbound",
      senderType: "contact",
      authorName: null,
      contentType: "text",
      text: "Hola, ¿qué horario tenéis?",
      transcript: null,
      transcriptionFailed: false,
      media: null,
      mediaRemoved: false,
      deletedByContact: false,
      status: "received",
      createdAt: new Date("2026-10-30T08:40:00Z"),
      sentAt: null,
      error: null,
      reactions: [],
      simulated: false,
      aiRunId: null,
    },
    {
      id: "msg-2",
      direction: "outbound",
      senderType: "ai",
      authorName: "Asistente",
      contentType: "text",
      text: "¡Hola María! Abrimos de lunes a viernes de 9 a 20h.",
      transcript: null,
      transcriptionFailed: false,
      media: null,
      mediaRemoved: false,
      deletedByContact: false,
      status: "read",
      createdAt: new Date("2026-10-30T08:41:12Z"),
      sentAt: new Date("2026-10-30T08:40:02Z"),
      error: null,
      reactions: [],
      simulated: false,
      aiRunId: null,
    },
  ];

  it("cleans safe filenames correctly", () => {
    expect(cleanSafeFilename("María Gómez / Factura #123?")).toBe("Maria_Gomez_Factura_123_");
  });

  it("generates conversation list in CSV format with UTF-8 BOM", () => {
    const csv = generateConversationListCsv(dummyListItems, "Últimos 7 días");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("María Gómez");
    expect(csv).toContain("WhatsApp (Recepción)");
    expect(csv).toContain("Sin leer (2)");
  });

  it("generates conversation list in XLSX format", () => {
    const xlsx = generateConversationListXlsx(dummyListItems, "Últimos 7 días");
    expect(xlsx).toBeInstanceOf(Uint8Array);
    expect(xlsx.length).toBeGreaterThan(100);
  });

  it("generates conversation list in PDF format", async () => {
    const pdfBuf = await generateConversationListPdf(dummyListItems, "Últimos 7 días");
    expect(Buffer.isBuffer(pdfBuf)).toBe(true);
    expect(pdfBuf.length).toBeGreaterThan(500);
    expect(pdfBuf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates individual conversation in CSV format", () => {
    const csv = generateConversationCsv(dummyConversation, dummyMessages);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("HISTORIAL DE CONVERSACIÓN");
    expect(csv).toContain("María Gómez");
    expect(csv).toContain("¡Hola María! Abrimos de lunes a viernes de 9 a 20h.");
  });

  it("generates individual conversation in XLSX format", () => {
    const xlsx = generateConversationXlsx(dummyConversation, dummyMessages);
    expect(xlsx).toBeInstanceOf(Uint8Array);
    expect(xlsx.length).toBeGreaterThan(100);
  });

  it("generates individual conversation in PDF format", async () => {
    const pdfBuf = await generateConversationPdf(dummyConversation, dummyMessages);
    expect(Buffer.isBuffer(pdfBuf)).toBe(true);
    expect(pdfBuf.length).toBeGreaterThan(500);
    expect(pdfBuf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates conversation ZIP with PDF, XLSX and CSV files included", async () => {
    const zipBytes = await generateConversationZip(dummyConversation, dummyMessages, "Conversacion_Maria");
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(500);
    // Standard ZIP signature PK..
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
  });
});
