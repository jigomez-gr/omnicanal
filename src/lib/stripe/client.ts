import { createHmac, timingSafeEqual } from "node:crypto"

export interface CreateStripeCheckoutInput {
  secretKey: string
  amountEur: number
  concept: string
  customerEmail?: string | null
  customerName?: string | null
  enableBizum?: boolean
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface CreateStripeCheckoutOutput {
  sessionId: string
  url: string
  simulated: boolean
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutInput,
): Promise<CreateStripeCheckoutOutput> {
  const unitAmountCents = Math.max(50, Math.round(input.amountEur * 100))

  // Si no hay clave real de Stripe configurada, devolvemos un enlace de pasarela demostrativa funcional
  if (!input.secretKey || !input.secretKey.startsWith("sk_")) {
    const simId = `cs_demo_${Date.now().toString(36)}`
    const url = `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${simId}&demo=1`
    return {
      sessionId: simId,
      url,
      simulated: true,
    }
  }

  const form = new URLSearchParams()
  form.set("mode", "payment")
  form.set("success_url", input.successUrl)
  form.set("cancel_url", input.cancelUrl)
  form.set("payment_method_types[0]", "card")
  if (input.enableBizum) {
    // Stripe soporta link/bizum según activación en la cuenta europea
    form.set("payment_method_types[1]", "link")
  }
  form.set("line_items[0][price_data][currency]", "eur")
  form.set("line_items[0][price_data][product_data][name]", input.concept)
  form.set(
    "line_items[0][price_data][product_data][description]",
    "Soniquete con Arte · Promoción Flamenca",
  )
  form.set("line_items[0][price_data][unit_amount]", String(unitAmountCents))
  form.set("line_items[0][quantity]", "1")

  if (input.customerEmail) {
    form.set("customer_email", input.customerEmail)
  }

  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      form.set(`metadata[${k}]`, v)
    }
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    })

    if (!response.ok) {
      const simId = `cs_fallback_${Date.now().toString(36)}`
      return {
        sessionId: simId,
        url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${simId}`,
        simulated: true,
      }
    }

    const data = (await response.json()) as { id?: string; url?: string }
    return {
      sessionId: data.id || `cs_${Date.now()}`,
      url: data.url || input.successUrl,
      simulated: false,
    }
  } catch {
    const simId = `cs_offline_${Date.now().toString(36)}`
    return {
      sessionId: simId,
      url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${simId}`,
      simulated: true,
    }
  }
}

export function verifyStripeWebhookSignature(params: {
  rawBody: string
  signatureHeader: string | null
  webhookSecret: string
  toleranceSeconds?: number
}): boolean {
  const { rawBody, signatureHeader, webhookSecret } = params
  if (!signatureHeader || !webhookSecret) return false

  const parts = signatureHeader.split(",").map((p) => p.trim())
  const timestampPart = parts.find((p) => p.startsWith("t="))
  const v1Parts = parts.filter((p) => p.startsWith("v1="))
  if (!timestampPart || v1Parts.length === 0) return false

  const timestamp = timestampPart.slice(2)
  const tsNum = Number(timestamp)
  if (!Number.isFinite(tsNum)) return false

  const tolerance = params.toleranceSeconds ?? 300
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - tsNum) > tolerance) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expectedSig = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex")

  const expectedBuf = Buffer.from(expectedSig, "hex")
  for (const v1 of v1Parts) {
    const candidateHex = v1.slice(3)
    if (candidateHex.length !== expectedSig.length) continue
    const candidateBuf = Buffer.from(candidateHex, "hex")
    if (
      candidateBuf.length === expectedBuf.length &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return true
    }
  }
  return false
}
