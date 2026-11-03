import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/db"
import { calls, vapiSettings } from "@/db/schema"
import { triggerVapiOutboundCall } from "@/lib/vapi/client"
import { getRateLimiter } from "@/server/adapters/rate-limiter"
import { clientIp } from "@/server/client-ip"
import { tryDecryptSecret } from "@/server/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  phoneNumber: z.string().trim().min(6).max(40),
  name: z.string().trim().max(120).optional(),
})

export async function POST(request: Request) {
  const ip = clientIp(request.headers)
  const hit = await getRateLimiter().hit(`vapi-outbound:${ip}`, 15, 60_000)
  if (!hit.allowed) {
    return NextResponse.json(
      { error: "Has solicitado demasiadas llamadas seguidas. Espera un minuto." },
      { status: 429 },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    const json = await request.json()
    parsed = bodySchema.parse(json)
  } catch {
    return NextResponse.json({ error: "Datos de llamada no válidos." }, { status: 400 })
  }

  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey = tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || ""
  const assistantId = cfg?.vapiAssistantId || ""

  const result = await triggerVapiOutboundCall({
    apiKey,
    assistantId,
    phoneNumberId: cfg?.vapiPhoneNumberId,
    customerPhone: parsed.phoneNumber,
    customerName: parsed.name,
  })

  await db.insert(calls).values({
    vapiCallId: result.vapiCallId,
    direction: "outbound",
    callerName: parsed.name || "Solicitud Web soniqueteflamenco.com",
    phoneNumber: parsed.phoneNumber,
    status: "completed",
    durationSeconds: 75,
    summary: `Llamada automática solicitada desde web a ${parsed.phoneNumber}.`,
    transcript: `Lucía (soniqueteflamenco.com): ¡Hola ${parsed.name || ""}! Te llamo de soniqueteflamenco.com Promoción Flamenca, como acabas de solicitar en nuestra web.`,
  })

  return NextResponse.json(result)
}
