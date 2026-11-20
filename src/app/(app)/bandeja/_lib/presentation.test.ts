import { describe, expect, it } from "vitest";
import { conversationDisplayName, formatConversationDatePrefix, formatConversationFullDate, handoffSourceLabel, mediaNotStoredText } from "./presentation";

describe("conversation display name and date formatting", () => {
  const sampleDate = new Date("2026-10-30T08:41:12.000Z"); // 09:41:12 in Madrid (UTC+1 on standard time)

  it("formats date prefix as ddMMyyyy_HHmmss", () => {
    const prefix = formatConversationDatePrefix(sampleDate, "Europe/Madrid");
    expect(prefix).toMatch(/^30102026_\d{6}$/);
  });

  it("formats full date with day of the week in Spanish", () => {
    const full = formatConversationFullDate(sampleDate, "Europe/Madrid");
    expect(full).toMatch(/^Viernes 30\/10\/2026 \d{2}:\d{2}:\d{2}$/);
  });

  it("builds display name with prefix and contact name", () => {
    const name = conversationDisplayName("María Pérez", sampleDate, "Europe/Madrid");
    expect(name).toMatch(/^30102026_\d{6} - María Pérez$/);
  });

  it("falls back to unnamed contact when name is missing", () => {
    const name = conversationDisplayName(null, sampleDate, "Europe/Madrid");
    expect(name).toMatch(/^30102026_\d{6} - Cliente sin nombre$/);
  });
});

describe("where a hand-off comes from [TRA-07]", () => {
  it("names the AI, a person or the agent's rule", () => {
    expect(handoffSourceLabel({ trigger: "ai_tool", rule: null })).toBe("La IA lo ha pedido");
    expect(handoffSourceLabel({ trigger: "human", rule: null })).toBe("Una persona, a mano");
    expect(handoffSourceLabel({ trigger: "rule", rule: "keyword" })).toBe("Regla del agente");
  });

  it("a failed AI reply or send is the platform's doing, not a rule of the agent [MOT-12]", () => {
    expect(handoffSourceLabel({ trigger: "rule", rule: "ai_failure" })).toBe("La IA ha fallado");
    expect(handoffSourceLabel({ trigger: "rule", rule: "send_failed" })).toBe("No se pudo enviar la respuesta");
  });
});

describe("a customer's file that is not stored yet [WA-41]", () => {
  it("says it is downloading, and «No se pudo descargar el archivo» when it could not be downloaded", () => {
    expect(mediaNotStoredText("audio", "pending")).toBe("Audio · descargando…");
    expect(mediaNotStoredText("audio", "failed")).toBe("No se pudo descargar el archivo");
    expect(mediaNotStoredText("document", "failed")).toBe("No se pudo descargar el archivo");
  });
});
