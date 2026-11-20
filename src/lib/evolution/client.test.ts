import { describe, expect, it, vi } from "vitest";
import {
  fetchEvolutionInstances,
  isEvolutionConfigured,
  jidToNumber,
  sendEvolutionText,
} from "./client";

describe("Evolution API client", () => {
  it("converts JID to digits", () => {
    expect(jidToNumber("34600111222@s.whatsapp.net")).toBe("34600111222");
    expect(jidToNumber("+34 600 111 222")).toBe("34600111222");
  });

  it("checks if configured", () => {
    expect(isEvolutionConfigured({ apiKey: "" })).toBe(false);
    expect(isEvolutionConfigured({ apiKey: "secret-key" })).toBe(true);
  });

  it("fetches instances with proper headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: "soniqueteflamenco", connectionStatus: "open" }]),
    });

    const instances = await fetchEvolutionInstances(
      { apiUrl: "https://evo.test", apiKey: "test-key" },
      mockFetch as unknown as typeof fetch,
    );

    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe("soniqueteflamenco");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://evo.test/instance/fetchInstances",
      expect.objectContaining({
        headers: { apikey: "test-key", "Content-Type": "application/json" },
      }),
    );
  });

  it("sends text message with number digits", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          key: { id: "EVO_MSG_123", fromMe: true, remoteJid: "34612345678@s.whatsapp.net" },
          status: "PENDING",
        }),
    });

    const result = await sendEvolutionText(
      { instanceName: "soniqueteflamenco", number: "34612345678@s.whatsapp.net", text: "Hola" },
      { apiUrl: "https://evo.test", apiKey: "test-key" },
      mockFetch as unknown as typeof fetch,
    );

    expect(result.key.id).toBe("EVO_MSG_123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://evo.test/message/sendText/soniqueteflamenco",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ number: "34612345678", text: "Hola" }),
      }),
    );
  });
});
