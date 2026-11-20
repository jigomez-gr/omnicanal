import { describe, expect, it } from "vitest";
import { connectVapiChannel, loadVapiChannel, simulateVapiCall } from "@/data/vapi";
import { connectZadarmaChannel, loadZadarmaChannel, simulateZadarmaSms } from "@/data/zadarma";
import { listConversations } from "@/data/conversations";
import { POST as vapiWebhookPost } from "@/app/api/webhooks/vapi/route";
import { GET as zadarmaWebhookGet, POST as zadarmaWebhookPost } from "@/app/api/webhooks/zadarma/route";
import { actorFor } from "@/test/factories";

describe("VAPI y Zadarma Channels & Conversations", () => {
  const owner = actorFor("owner");

  it("conecta un canal de Vapi y cifra sus secretos", async () => {
    const channelName = `Vapi Central ${Date.now()}`;
    const result = await connectVapiChannel(owner, {
      name: channelName,
      apiKey: "vapi_test_key_12345",
      assistantId: "asst-uuid-987",
      phoneNumberId: "phone-uuid-111",
      webhookToken: "secret_token_vapi",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe(channelName);
    expect(result.webhookUrl).toContain("/api/webhooks/vapi");

    const loaded = await loadVapiChannel(result.id);
    expect(loaded.config.assistantId).toBe("asst-uuid-987");
    expect(loaded.maskedApiKey).toContain("••••");
    expect(loaded.hasWebhookToken).toBe(true);
  });

  it("conecta un canal de Zadarma y cifra sus credenciales", async () => {
    const channelName = `Zadarma SMS ${Date.now()}`;
    const result = await connectZadarmaChannel(owner, {
      name: channelName,
      apiKey: "zadarma_api_key_abc",
      apiSecret: "zadarma_secret_xyz",
      senderId: "MyBusiness",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe(channelName);
    expect(result.webhookUrl).toContain("/api/webhooks/zadarma");

    const loaded = await loadZadarmaChannel(result.id);
    expect(loaded.config.senderId).toBe("MyBusiness");
    expect(loaded.maskedApiKey).toContain("••••");
    expect(loaded.hasSecret).toBe(true);
  });

  it("simula una llamada de Vapi y aparece en las conversaciones con metadata, audio y transcripción", async () => {
    const channelName = `Vapi Sim ${Date.now()}`;
    const { id: channelId } = await connectVapiChannel(owner, {
      name: channelName,
      apiKey: "key_vapi_sim",
    });

    const sim = await simulateVapiCall(owner, channelId);
    expect(sim.success).toBe(true);
    expect(sim.conversationId).toBeDefined();

    // Verify conversation was created
    const list = await listConversations(owner, { channelType: "call" });
    const found = list.items.find((item) => item.id === sim.conversationId);
    expect(found).toBeDefined();
    expect(found?.channel.type).toBe("phone_vapi");
  });

  it("simula un mensaje SMS de Zadarma y se lista en conversaciones con filtro sms", async () => {
    const channelName = `Zadarma Sim ${Date.now()}`;
    const { id: channelId } = await connectZadarmaChannel(owner, {
      name: channelName,
      apiKey: "key_zadarma_sim",
      apiSecret: "secret_zadarma_sim",
    });

    const sim = await simulateZadarmaSms(owner, channelId);
    expect(sim.success).toBe(true);

    const list = await listConversations(owner, { channelType: "sms" });
    const found = list.items.find((item) => item.id === sim.conversationId);
    expect(found).toBeDefined();
    expect(found?.channel.type).toBe("sms_zadarma");
  });

  it("el webhook de Vapi procesa end-of-call-report y crea la conversación", async () => {
    const vapiCallId = `vapi_wh_${Date.now()}`;
    const req = new Request("http://localhost:3000/api/webhooks/vapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          type: "end-of-call-report",
          call: {
            id: vapiCallId,
            duration: 95,
            cost: 0.03,
            customer: { number: "+34678112233" },
          },
          artifact: {
            recordingUrl: "https://example.com/recording.mp3",
            messages: [
              { role: "user", message: "Hola, ¿tenéis cita para mañana?" },
              { role: "assistant", message: "Sí, a las 10:00 está libre." },
            ],
          },
          analysis: {
            summary: "Llamada para solicitar cita mañanera.",
          },
        },
      }),
    });

    const res = await vapiWebhookPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("el webhook de Zadarma responde al reto zd_echo en GET y recibe SMS en POST", async () => {
    // 1. GET with zd_echo
    const getReq = new Request("http://localhost:3000/api/webhooks/zadarma?zd_echo=challenge123");
    const getRes = await zadarmaWebhookGet(getReq);
    expect(getRes.status).toBe(200);
    expect(await getRes.text()).toBe("challenge123");

    // 2. POST with incoming SMS
    const postReq = new Request("http://localhost:3000/api/webhooks/zadarma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caller_id: "+34699887766",
        message: "Respuesta por SMS del cliente",
        to: "Teamsale",
      }),
    });

    const postRes = await zadarmaWebhookPost(postReq);
    expect(postRes.status).toBe(200);
    expect(await postRes.text()).toBe("OK");
  });
});
