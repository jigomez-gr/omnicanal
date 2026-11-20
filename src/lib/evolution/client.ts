// Client for Evolution API v2.3.7. Interacts with the WhatsApp Baileys microservice.
// Keeps credentials in the backend environment only, never sent to the browser.
import "server-only";

export type EvolutionConfig = {
  apiUrl?: string;
  apiKey?: string;
  instanceName?: string;
};

export type EvolutionConnectionState = "open" | "connecting" | "close";

export type EvolutionInstance = {
  id: string;
  name: string;
  connectionStatus: EvolutionConnectionState | string;
  integration: string;
  number?: string | null;
  profileName?: string | null;
};

export type EvolutionSendTextResult = {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: { text: string };
  };
  messageTimestamp: number | string;
  status: string;
};

export type EvolutionWebhookConfig = {
  enabled: boolean;
  url: string;
  byEvents?: boolean;
  base64?: boolean;
  events?: string[];
  headers?: Record<string, string>;
};

export function getEvolutionConfig(override?: EvolutionConfig): {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
} {
  const apiUrl = (override?.apiUrl || process.env.EVOLUTION_API_URL || "https://evolutionapisoniqueteflamenco.jigretera.com").replace(/\/+$/, "");
  const apiKey = override?.apiKey || process.env.EVOLUTION_API_KEY || "";
  const instanceName = override?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "soniqueteflamenco";
  return { apiUrl, apiKey, instanceName };
}

export function isEvolutionConfigured(override?: EvolutionConfig): boolean {
  const { apiKey } = getEvolutionConfig(override);
  return apiKey.trim().length > 0;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    apikey: apiKey,
    "Content-Type": "application/json",
  };
}

/** Converts a raw WhatsApp JID (e.g. 34600000000@s.whatsapp.net) to phone number digits for Evolution API. */
export function jidToNumber(jid: string): string {
  return jid.replace(/@.*$/, "").replace(/\D/g, "");
}

/** Fetches all instances on the Evolution API server. */
export async function fetchEvolutionInstances(
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<EvolutionInstance[]> {
  const { apiUrl, apiKey } = getEvolutionConfig(config);
  const response = await fetchImpl(`${apiUrl}/instance/fetchInstances`, {
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Evolution API error ${response.status} en fetchInstances`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/** Checks the connection state of an instance («open», «connecting», «close»). */
export async function getEvolutionConnectionState(
  instanceName?: string,
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ state: EvolutionConnectionState | string }> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const targetInstance = instanceName || defaultInstance;
  const response = await fetchImpl(`${apiUrl}/instance/connectionState/${encodeURIComponent(targetInstance)}`, {
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Evolution API error ${response.status} al consultar estado de ${targetInstance}`);
  }
  const data = (await response.json()) as { instance?: { state?: string } };
  return { state: (data.instance?.state as EvolutionConnectionState) || "close" };
}

/** Gets the connection QR code (string + base64) for linking an instance. */
export async function getEvolutionConnectQr(
  instanceName?: string,
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ code?: string; base64?: string; count?: number }> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const targetInstance = instanceName || defaultInstance;
  const response = await fetchImpl(`${apiUrl}/instance/connect/${encodeURIComponent(targetInstance)}`, {
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Evolution API error ${response.status} al generar QR de ${targetInstance}`);
  }
  return response.json();
}

/** Sends a text message through Evolution API. */
export async function sendEvolutionText(
  target: { instanceName?: string; number: string; text: string },
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<EvolutionSendTextResult> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = target.instanceName || defaultInstance;
  const recipient = jidToNumber(target.number);
  const response = await fetchImpl(`${apiUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      number: recipient,
      text: target.text,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Evolution API error ${response.status} al enviar texto a ${recipient}: ${errorBody.slice(0, 100)}`);
  }
  return response.json();
}

export type SendMediaParams = {
  instanceName?: string;
  number: string;
  media: string; // base64 or URL
  mediatype: "image" | "document" | "audio";
  mimetype?: string;
  fileName?: string;
  caption?: string;
};

/** Sends an image, document, or audio file through Evolution API. */
export async function sendEvolutionMedia(
  params: SendMediaParams,
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<EvolutionSendTextResult> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = params.instanceName || defaultInstance;
  const recipient = jidToNumber(params.number);
  const response = await fetchImpl(`${apiUrl}/message/sendMedia/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      number: recipient,
      media: params.media,
      mediatype: params.mediatype,
      mimetype: params.mimetype,
      fileName: params.fileName,
      caption: params.caption,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Evolution API error ${response.status} al enviar archivo a ${recipient}: ${errorBody.slice(0, 100)}`);
  }
  return response.json();
}

/** Sends typing presence («composing» / «paused») to a chat. */
export async function sendEvolutionPresence(
  params: { instanceName?: string; number: string; presence: "composing" | "paused" },
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = params.instanceName || defaultInstance;
  const recipient = jidToNumber(params.number);
  await fetchImpl(`${apiUrl}/chat/sendPresence/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      number: recipient,
      presence: params.presence,
    }),
    cache: "no-store",
  }).catch(() => undefined);
}

/** Marks a message as read in WhatsApp. */
export async function markEvolutionAsRead(
  params: { instanceName?: string; remoteJid: string; id: string },
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = params.instanceName || defaultInstance;
  await fetchImpl(`${apiUrl}/chat/markMessageAsRead/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      read_messages: [
        {
          remoteJid: params.remoteJid,
          id: params.id,
          fromMe: false,
        },
      ],
    }),
    cache: "no-store",
  }).catch(() => undefined);
}

/** Disconnects/logs out the instance from WhatsApp. */
export async function logoutEvolutionInstance(
  instanceName?: string,
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = instanceName || defaultInstance;
  const response = await fetchImpl(`${apiUrl}/instance/logout/${encodeURIComponent(instance)}`, {
    method: "DELETE",
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Evolution API error ${response.status} al cerrar sesión de ${instance}`);
  }
}

/** Configures webhook on an instance in Evolution API. */
export async function setEvolutionWebhook(
  params: { instanceName?: string; webhook: EvolutionWebhookConfig },
  config?: EvolutionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const { apiUrl, apiKey, instanceName: defaultInstance } = getEvolutionConfig(config);
  const instance = params.instanceName || defaultInstance;
  const response = await fetchImpl(`${apiUrl}/webhook/set/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      webhook: params.webhook,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Evolution API error ${response.status} al configurar webhook en ${instance}`);
  }
  return response.json();
}
