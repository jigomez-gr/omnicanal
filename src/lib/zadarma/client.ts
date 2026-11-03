import { createHash, createHmac } from "node:crypto"

/**
 * Codificación RFC 3986 idéntica a rawurlencode de PHP, requerida por Zadarma API v1.
 */
export function rfc3986Encode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+")
}

/**
 * Construye la cabecera Authorization para Zadarma (`apiKey:signatureBase64`).
 * Algoritmo exacto copiado de `crm_salvadora/backend/src/sms/zadarma-sms.service.ts`:
 * 1. Ordenar parámetros alfabéticamente.
 * 2. Construir query string RFC 3986.
 * 3. Calcular MD5 en hex de la query string.
 * 4. Concatenar `methodPath + queryString + md5Hex`.
 * 5. Calcular HMAC-SHA1 en hex con `apiSecret` y codificar ese hex en Base64.
 */
export function generateZadarmaAuthHeader(params: {
  methodPath: string
  queryParams: Record<string, string>
  apiKey: string
  apiSecret: string
}): { authHeader: string; queryString: string } {
  const sortedKeys = Object.keys(params.queryParams).sort()
  const queryString = sortedKeys
    .map((k) => `${rfc3986Encode(k)}=${rfc3986Encode(params.queryParams[k] ?? "")}`)
    .join("&")

  const md5Hash = createHash("md5").update(queryString).digest("hex")
  const signString = `${params.methodPath}${queryString}${md5Hash}`
  const hmacHex = createHmac("sha1", params.apiSecret).update(signString).digest("hex")
  const signature = Buffer.from(hmacHex).toString("base64")

  return {
    authHeader: `${params.apiKey}:${signature}`,
    queryString,
  }
}

/**
 * Sanea el texto del SMS para evitar el bloqueo anti-phishing de operadoras españolas
 * (elimina enlaces http/https y dominios .com), exactamente como en `crm_salvadora`.
 */
export function sanitizeZadarmaSmsMessage(message: string): string {
  return message
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[\w-]+\.com[^\s]*/gi, "nuestra web")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeSpanishPhoneForZadarma(phone: string): string {
  let clean = phone.replace(/\D/g, "")
  if (clean.length === 9 && /^[6789]/.test(clean)) {
    clean = `34${clean}`
  }
  return clean
}

export interface SendZadarmaSmsInput {
  apiKey: string
  apiSecret: string
  toPhone: string
  message: string
  callerId?: string | null
}

export interface SendZadarmaSmsOutput {
  ok: boolean
  cleanPhone: string
  sanitizedMessage: string
  status: string
  cost?: string
  messagesCount?: number
  rawResponse: string
  errorMessage?: string
}

export async function sendZadarmaSms(
  input: SendZadarmaSmsInput,
): Promise<SendZadarmaSmsOutput> {
  const cleanPhone = normalizeSpanishPhoneForZadarma(input.toPhone)
  const sanitizedMessage = sanitizeZadarmaSmsMessage(input.message)
  const methodPath = "/v1/sms/send/"

  const queryParams: Record<string, string> = {
    number: cleanPhone,
    message: sanitizedMessage,
  }
  const effectiveSender = input.callerId?.trim() || "Teamsale"
  if (effectiveSender && effectiveSender !== "none") {
    queryParams.sender = effectiveSender
  }

  if (!input.apiKey || !input.apiSecret) {
    const simulatedPayload = JSON.stringify({
      status: "success",
      messages: 1,
      cost: 0.045,
      currency: "EUR",
      simulated: true,
    })
    return {
      ok: true,
      cleanPhone,
      sanitizedMessage,
      status: "simulated_success",
      cost: "0.045 EUR",
      messagesCount: 1,
      rawResponse: simulatedPayload,
    }
  }

  const { authHeader, queryString } = generateZadarmaAuthHeader({
    methodPath,
    queryParams,
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
  })

  try {
    const response = await fetch(`https://api.zadarma.com${methodPath}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryString,
    })

    const rawText = await response.text()
    let parsed: { status?: string; message?: string; cost?: string | number; messages?: number } =
      {}
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // mantener rawText
    }

    if (response.ok && parsed.status === "success") {
      return {
        ok: true,
        cleanPhone,
        sanitizedMessage,
        status: "success",
        cost: parsed.cost !== undefined ? String(parsed.cost) : undefined,
        messagesCount: parsed.messages ?? 1,
        rawResponse: rawText,
      }
    }

    return {
      ok: false,
      cleanPhone,
      sanitizedMessage,
      status: "error",
      rawResponse: rawText,
      errorMessage: parsed.message || `HTTP ${response.status}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red con Zadarma"
    return {
      ok: false,
      cleanPhone,
      sanitizedMessage,
      status: "error",
      rawResponse: JSON.stringify({ status: "error", message: msg }),
      errorMessage: msg,
    }
  }
}
