import "server-only";
import PDFDocument from "pdfkit";
import type { ConversationDetail, ConversationListItem } from "@/data/conversations";
import type { MessageItem } from "@/data/messages";
import { formatDateTime } from "@/lib/format";
import { getFileStorage, readAll } from "@/server/adapters/file-storage";
import { xlsxFile, zipFiles } from "@/server/xlsx-file";

const TIMEZONE = "Europe/Madrid";

export function cleanSafeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function formatDate(date?: Date | string | number | null): string {
  if (!date) return "-";
  return formatDateTime(date, TIMEZONE, { pattern: "dd/MM/yyyy HH:mm:ss" });
}

function formatChannel(type: string, name?: string | null): string {
  const t = type.toLowerCase();
  const base =
    t === "whatsapp"
      ? "WhatsApp"
      : t === "telegram"
        ? "Telegram"
        : t === "instagram"
          ? "Instagram"
          : t.startsWith("email")
            ? "Email"
            : t === "webchat" || t === "web_chat"
              ? "Chat Web"
              : t === "phone_vapi" || t === "call"
                ? "Llamadas"
                : t === "sms_zadarma" || t === "sms"
                  ? "SMS"
                  : type;
  return name ? `${base} (${name})` : base;
}

// ─── 1. EXPORT CONVERSATION LIST (CSV / XLSX / PDF) ──────────────────────────

export function generateConversationListCsv(items: ConversationListItem[], filterInfo?: string): string {
  const BOM = "\uFEFF";
  const lines: string[] = [];
  if (filterInfo) lines.push(`# Filtros: ${filterInfo}`);
  lines.push("Fecha;Canal;Contacto;Teléfono/Info;Estado;Modo IA;Último Mensaje");

  for (const item of items) {
    const fecha = formatDate(item.lastMessageAt || item.createdAt);
    const canal = formatChannel(item.channel.type, item.channel.name);
    const contacto = item.contact?.name || "Sin nombre";
    const estado = item.unreadCount > 0 ? `Sin leer (${item.unreadCount})` : "Leído";
    const modo = item.aiMode === "human" ? "Persona" : "IA";
    const preview = (item.lastMessage?.preview || "").replace(/[\r\n]+/g, " ").replace(/"/g, '""');
    lines.push(`"${fecha}";"${canal}";"${contacto}";"-";"${estado}";"${modo}";"${preview}"`);
  }

  return BOM + lines.join("\r\n");
}

export function generateConversationListXlsx(items: ConversationListItem[], filterInfo?: string): Uint8Array {
  const rows: (string | number)[][] = [
    ["LISTADO DE CONVERSACIONES", "", "", "", "", "", ""],
    [`Filtros: ${filterInfo || "Todas las conversaciones"} | Total: ${items.length} | Generado: ${formatDate(new Date())}`, "", "", "", "", "", ""],
    ["Fecha", "Canal", "Contacto", "Estado", "Modo IA", "Mensajes sin leer", "Último Mensaje"],
  ];

  for (const item of items) {
    const fecha = formatDate(item.lastMessageAt || item.createdAt);
    const canal = formatChannel(item.channel.type, item.channel.name);
    const contacto = item.contact?.name || "Sin nombre";
    const estado = item.unreadCount > 0 ? `Sin leer (${item.unreadCount})` : "Leído";
    const modo = item.aiMode === "human" ? "Persona" : "IA";
    const unread = item.unreadCount;
    const preview = (item.lastMessage?.preview || "").replace(/[\r\n]+/g, " ");
    rows.push([fecha, canal, contacto, estado, modo, unread, preview]);
  }

  return xlsxFile("Conversaciones", rows);
}

export async function generateConversationListPdf(items: ConversationListItem[], filterInfo?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - 72;

    // Header banner
    doc.rect(36, 36, contentWidth, 42).fill("#4F46E5");
    doc.fillColor("#FFFFFF").fontSize(13).font("Helvetica-Bold").text("LISTADO DE CONVERSACIONES", 48, 45);
    doc.fillColor("#E0E7FF").fontSize(8).font("Helvetica").text(`Filtros: ${filterInfo || "Todas las conversaciones"} | Total: ${items.length} | Generado: ${formatDate(new Date())}`, 48, 62);

    let y = 90;
    const colX = {
      fecha: 36,
      canal: 36 + 110,
      contacto: 36 + 110 + 110,
      estado: 36 + 110 + 110 + 130,
      modo: 36 + 110 + 110 + 130 + 80,
      msg: 36 + 110 + 110 + 130 + 80 + 70,
    };
    const colW = {
      fecha: 105,
      canal: 105,
      contacto: 125,
      estado: 75,
      modo: 65,
      msg: contentWidth - 505,
    };

    const drawHeader = (currY: number) => {
      doc.rect(36, currY, contentWidth, 20).fill("#F3F4F6");
      doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8);
      doc.text("FECHA", colX.fecha + 4, currY + 6);
      doc.text("CANAL", colX.canal + 4, currY + 6);
      doc.text("CONTACTO", colX.contacto + 4, currY + 6);
      doc.text("ESTADO", colX.estado + 4, currY + 6);
      doc.text("MODO", colX.modo + 4, currY + 6);
      doc.text("ÚLTIMO MENSAJE", colX.msg + 4, currY + 6);
      return currY + 22;
    };

    y = drawHeader(y);

    items.forEach((item, idx) => {
      if (y + 20 > doc.page.height - 40) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
        y = drawHeader(36);
      }

      if (idx % 2 === 0) {
        doc.rect(36, y, contentWidth, 18).fill("#F9FAFB");
      }

      const fecha = formatDate(item.lastMessageAt || item.createdAt);
      const canal = formatChannel(item.channel.type, item.channel.name);
      const contacto = item.contact?.name || "Sin nombre";
      const estado = item.unreadCount > 0 ? `Sin leer (${item.unreadCount})` : "Leído";
      const modo = item.aiMode === "human" ? "Persona" : "IA";
      const msg = (item.lastMessage?.preview || "").replace(/[\r\n]+/g, " ").slice(0, 75);

      doc.fillColor("#111827").font("Helvetica").fontSize(7.5);
      doc.text(fecha, colX.fecha + 4, y + 5, { width: colW.fecha, lineBreak: false });
      doc.text(canal, colX.canal + 4, y + 5, { width: colW.canal, lineBreak: false });
      doc.text(contacto, colX.contacto + 4, y + 5, { width: colW.contacto, lineBreak: false });
      doc.text(estado, colX.estado + 4, y + 5, { width: colW.estado, lineBreak: false });
      doc.text(modo, colX.modo + 4, y + 5, { width: colW.modo, lineBreak: false });
      doc.text(msg, colX.msg + 4, y + 5, { width: colW.msg, lineBreak: false });

      y += 18;
    });

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text(`Página ${i + 1} de ${totalPages} · DominIA Agentes`, 36, doc.page.height - 25, { align: "center", width: contentWidth });
    }

    doc.end();
  });
}

// ─── 2. EXPORT SINGLE CONVERSATION (CSV / XLSX / PDF / ZIP) ──────────────────

export function generateConversationCsv(conversation: ConversationDetail, messages: MessageItem[]): string {
  const BOM = "\uFEFF";
  const lines: string[] = [];
  const contactName = conversation.contact?.name || "Sin nombre";
  const channelName = formatChannel(conversation.channel.type, conversation.channel.name);

  lines.push(`# HISTORIAL DE CONVERSACIÓN`);
  lines.push(`# Contacto: ${contactName}`);
  lines.push(`# Teléfono: ${conversation.contact?.phone || "-"}`);
  lines.push(`# Email: ${conversation.contact?.email || "-"}`);
  lines.push(`# Canal: ${channelName}`);
  lines.push(`# Total de mensajes: ${messages.length}`);
  lines.push(`# Fecha de exportación: ${formatDate(new Date())}`);
  lines.push("");

  lines.push("Nº;Fecha y Hora;Tipo/Canal;Dirección;Remitente;Mensaje;Archivos Adjuntos");

  messages.forEach((m, idx) => {
    const num = idx + 1;
    const dateStr = formatDate(m.createdAt);
    const canal = formatChannel(conversation.channel.type);
    const direction = m.direction === "inbound" ? "Entrante" : "Saliente";
    const sender = m.direction === "inbound" ? contactName : m.senderType === "ai" ? "Agente IA" : "Equipo";
    const cleanBody = (m.text || "").replace(/[\r\n]+/g, " ").replace(/"/g, '""');
    const attachmentInfo = m.media?.fileName ? `[${m.contentType}: ${m.media.fileName}]` : m.media ? `[Adjunto: ${m.contentType}]` : "";

    lines.push(`${num};"${dateStr}";"${canal}";"${direction}";"${sender}";"${cleanBody}";"${attachmentInfo}"`);
  });

  return BOM + lines.join("\r\n");
}

export function generateConversationXlsx(conversation: ConversationDetail, messages: MessageItem[]): Uint8Array {
  const contactName = conversation.contact?.name || "Sin nombre";
  const channelName = formatChannel(conversation.channel.type, conversation.channel.name);

  const rows: (string | number)[][] = [
    ["HISTORIAL DE CONVERSACIÓN", "", "", "", "", "", ""],
    [`Contacto: ${contactName} | Teléfono: ${conversation.contact?.phone || "-"} | Canal: ${channelName} | Generado: ${formatDate(new Date())}`, "", "", "", "", "", ""],
    ["Nº", "Fecha y Hora", "Tipo / Canal", "Dirección", "Remitente", "Mensaje", "Archivos Adjuntos"],
  ];

  messages.forEach((m, idx) => {
    const num = idx + 1;
    const dateStr = formatDate(m.createdAt);
    const canal = formatChannel(conversation.channel.type);
    const direction = m.direction === "inbound" ? "Entrante (Cliente)" : "Saliente (Equipo/IA)";
    const sender = m.direction === "inbound" ? contactName : m.senderType === "ai" ? "Agente IA" : "Equipo";
    const cleanBody = (m.text || "").replace(/[\r\n]+/g, " ");
    const attachmentInfo = m.media?.fileName ? `[${m.contentType}: ${m.media.fileName}]` : m.media ? `[Adjunto: ${m.contentType}]` : "";

    rows.push([num, dateStr, canal, direction, sender, cleanBody, attachmentInfo]);
  });

  return xlsxFile("Historial", rows);
}

export async function generateConversationPdf(conversation: ConversationDetail, messages: MessageItem[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - 80;
    const contactName = conversation.contact?.name || "Sin nombre";
    const channelName = formatChannel(conversation.channel.type, conversation.channel.name);

    // Header banner
    doc.rect(40, 40, contentWidth, 50).fill("#4F46E5");
    doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text("HISTORIAL DE CONVERSACIÓN", 52, 50);
    doc.fillColor("#E0E7FF").fontSize(9).font("Helvetica").text(`${contactName} (${conversation.contact?.phone || conversation.contact?.email || "Sin contacto"}) · Canal: ${channelName}`, 52, 68);

    let y = 110;

    messages.forEach((m) => {
      const isInbound = m.direction === "inbound";
      const sender = isInbound ? contactName : m.senderType === "ai" ? "Agente IA" : "Equipo";
      const dateStr = formatDate(m.createdAt);
      const text = m.text || (m.media?.fileName ? `[Archivo: ${m.media.fileName}]` : "");

      // Estimate height
      doc.fontSize(9).font("Helvetica");
      const textHeight = doc.heightOfString(text, { width: contentWidth - 40 });
      const blockHeight = textHeight + 28;

      if (y + blockHeight > doc.page.height - 50) {
        doc.addPage({ size: "A4", margin: 40 });
        y = 40;
      }

      // Bubble
      const bubbleBg = isInbound ? "#F3F4F6" : "#EEF2FF";
      doc.rect(40, y, contentWidth, blockHeight).fill(bubbleBg);

      doc.fillColor(isInbound ? "#374151" : "#4338CA").font("Helvetica-Bold").fontSize(8.5).text(sender, 48, y + 6);
      doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5).text(dateStr, contentWidth - 40, y + 7, { align: "right" });

      doc.fillColor("#111827").font("Helvetica").fontSize(9).text(text, 48, y + 18, { width: contentWidth - 20 });

      y += blockHeight + 8;
    });

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text(`Página ${i + 1} de ${totalPages} · DominIA Agentes`, 40, doc.page.height - 30, { align: "center", width: contentWidth });
    }

    doc.end();
  });
}

/**
 * Creates a ZIP file containing the transcripts (PDF, XLSX, CSV) and an `adjuntos/` folder with all downloadable media.
 */
export async function generateConversationZip(
  conversation: ConversationDetail,
  messages: MessageItem[],
  baseFileName: string,
): Promise<Uint8Array> {
  const [pdfBuf, xlsxBytes] = await Promise.all([
    generateConversationPdf(conversation, messages),
    generateConversationXlsx(conversation, messages),
  ]);
  const csvStr = generateConversationCsv(conversation, messages);

  const filesToZip: Record<string, string | Uint8Array> = {
    [`${baseFileName}.pdf`]: new Uint8Array(pdfBuf),
    [`${baseFileName}.xlsx`]: xlsxBytes,
    [`${baseFileName}.csv`]: csvStr,
  };

  // Attachments
  const storage = getFileStorage();
  const seenNames = new Set<string>();

  for (let idx = 0; idx < messages.length; idx++) {
    const m = messages[idx];
    if (m.media?.url?.startsWith("/api/files/")) {
      const fileKey = m.media.url.slice("/api/files/".length);
      try {
        const file = await storage.get(fileKey);
        if (file) {
          const bytes = await readAll(file.stream);
          let origName = m.media.fileName || `adjunto_${idx + 1}`;
          if (seenNames.has(origName)) {
            origName = `${idx + 1}_${origName}`;
          }
          seenNames.add(origName);
          filesToZip[`adjuntos/${origName}`] = bytes;
        }
      } catch {
        // Ignored if storage file is missing
      }
    }
  }

  return zipFiles(filesToZip);
}
