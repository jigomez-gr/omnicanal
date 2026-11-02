import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { contracts, paymentRecords, paymentSettings } from "@/db/schema"
import { verifyStripeWebhookSignature } from "@/lib/stripe/client"
import { getRateLimiter } from "@/server/adapters/rate-limiter"
import { clientIp } from "@/server/client-ip"
import { tryDecryptSecret } from "@/server/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ip = clientIp(request.headers)
  const hit = await getRateLimiter().hit(`stripe-webhook:${ip}`, 300, 60_000)
  if (!hit.allowed) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 })
  }

  const rawBody = await request.text()
  const sigHeader = request.headers.get("stripe-signature")

  const [cfg] = await db.select().from(paymentSettings).limit(1)
  const webhookSecret = tryDecryptSecret(cfg?.webhookSecretEncrypted)

  if (webhookSecret) {
    const valid = verifyStripeWebhookSignature({
      rawBody,
      signatureHeader: sigHeader,
      webhookSecret,
    })
    if (!valid) {
      return NextResponse.json({ error: "Firma de Stripe no válida" }, { status: 400 })
    }
  }

  let event: {
    type?: string
    data?: {
      object?: {
        id?: string
        payment_intent?: string
        metadata?: Record<string, string>
      }
    }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object
    const sessionId = session?.id
    if (sessionId) {
      const [record] = await db
        .select()
        .from(paymentRecords)
        .where(eq(paymentRecords.stripeSessionId, sessionId))
        .limit(1)

      if (record) {
        await db
          .update(paymentRecords)
          .set({
            status: "paid",
            stripePaymentIntentId:
              typeof session?.payment_intent === "string" ? session.payment_intent : null,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(paymentRecords.id, record.id))

        if (record.contractId) {
          await db
            .update(contracts)
            .set({ status: "pagado", updatedAt: new Date() })
            .where(eq(contracts.id, record.contractId))
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
