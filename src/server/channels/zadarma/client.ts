// Zadarma API Client (SMS and telephony integration).
import "server-only";
import crypto from "node:crypto";

export interface SendZadarmaSmsOptions {
  number: string;
  message: string;
  sender?: string;
  apiKey: string;
  apiSecret: string;
}

export interface ZadarmaSmsResponse {
  status: "success" | "error";
  messages?: number;
  cost?: number;
  currency?: string;
  message?: string;
  raw?: unknown;
}

/**
 * RFC 3986 URL encoding for Zadarma signatures.
 */
function zadarmaUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

/**
 * Generates HMAC-SHA1 signature according to Zadarma specifications:
 * 1. Sort parameters alphabetically by key.
 * 2. Form query string.
 * 3. MD5 hash of query string.
 * 4. Concatenate: method_path + queryString + md5Hash.
 * 5. Compute HMAC-SHA1 using secret key, format as hex, then Base64 encode.
 * 6. Header: Authorization: {apiKey}:{signature}
 */
export function generateZadarmaAuthHeader(
  apiKey: string,
  apiSecret: string,
  methodPath: string,
  params: Record<string, string>,
): string {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${zadarmaUrlEncode(params[k])}`).join("&");
  const md5Hash = crypto.createHash("md5").update(queryString).digest("hex");
  const toSign = `${methodPath}${queryString}${md5Hash}`;
  const hmacHex = crypto.createHmac("sha1", apiSecret).update(toSign).digest("hex");
  const signature = Buffer.from(hmacHex).toString("base64");
  return `${apiKey}:${signature}`;
}

/**
 * Sends an SMS message via Zadarma API.
 */
export async function sendZadarmaSms(options: SendZadarmaSmsOptions): Promise<ZadarmaSmsResponse> {
  const cleanNumber = options.number.replace(/\s+/g, "").replace(/^[+]/, "");
  const methodPath = "/v1/sms/send/";
  const params: Record<string, string> = {
    number: cleanNumber,
    message: options.message,
  };
  if (options.sender && options.sender.trim() !== "") {
    params.sender = options.sender.trim();
  }

  const authHeader = generateZadarmaAuthHeader(options.apiKey, options.apiSecret, methodPath, params);

  try {
    const formData = new URLSearchParams(params);
    const response = await fetch(`https://api.zadarma.com${methodPath}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();
    if (data.status === "success") {
      return {
        status: "success",
        messages: data.messages ?? 1,
        cost: data.cost,
        currency: data.currency,
        raw: data,
      };
    }
    return {
      status: "error",
      message: data.message ?? "Error en la pasarela de Zadarma",
      raw: data,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
