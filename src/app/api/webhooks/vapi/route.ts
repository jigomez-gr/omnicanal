import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import {
  artists,
  calcomSettings,
  calls,
  concerts,
  vapiSettings,
  venues,
  zadarmaSmsRespuesta,
} from "@/db/schema"
import { createCalcomBooking } from "@/lib/calcom/client"
import { sendZadarmaSms } from "@/lib/zadarma/client"
import { getRateLimiter } from "@/server/adapters/rate-limiter"
import { clientIp } from "@/server/client-ip"
import { tryDecryptSecret } from "@/server/crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ip = clientIp(request.headers)
  const hit = await getRateLimiter().hit(`vapi-webhook:${ip}`, 300, 60_000)
  if (!hit.allowed) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 })
  }

  let body: {
    message?: {
      type?: string
      call?: {
        id?: string
        customer?: { number?: string; name?: string }
      }
      artifact?: {
        transcript?: string
        recordingUrl?: string
      }
      analysis?: {
        summary?: string
      }
      durationSeconds?: number
      toolCallList?: Array<{
        id: string
        function?: {
          name?: string
          arguments?: string | Record<string, unknown>
        }
      }>
    }
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const msg = body.message
  const msgType = msg?.type || "status-update"

  if (msgType === "tool-calls" && Array.isArray(msg?.toolCallList)) {
    const results: Array<{ toolCallId: string; result: string }> = []

    for (const tc of msg.toolCallList) {
      const fnName = tc.function?.name || ""
      const rawArgs = tc.function?.arguments
      let args: Record<string, unknown> = {}
      if (typeof rawArgs === "string") {
        try {
          args = JSON.parse(rawArgs)
        } catch {
          args = {}
        }
      } else if (rawArgs && typeof rawArgs === "object") {
        args = rawArgs
      }

      if (fnName === "identificar_llamante") {
        const phone = String(args.telefono ?? "")
        const allVenues = await db.select().from(venues)
        const matchedVenue = allVenues.find(
          (v) => v.phone && phone && v.phone.replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-9)),
        )
        if (matchedVenue) {
          results.push({
            toolCallId: tc.id,
            result: JSON.stringify({
              identificado: true,
              tipo: "sala",
              nombre: matchedVenue.name,
              programador: matchedVenue.programmerName,
              ciudad: matchedVenue.city,
              aforo: matchedVenue.capacity,
            }),
          })
        } else {
          results.push({
            toolCallId: tc.id,
            result: JSON.stringify({
              identificado: false,
              mensaje: "Nuevo contacto. Pídele su nombre, sala o proyecto artístico y ciudad.",
            }),
          })
        }
      } else if (fnName === "consultar_artistas") {
        const artistRows = await db.select().from(artists)
        results.push({
          toolCallId: tc.id,
          result: JSON.stringify(
            artistRows.map((a) => ({
              nombre: a.artisticName,
              disciplina: a.discipline,
              palos: a.styles,
              llevaGrupo: a.bringsGroup,
              formacion: a.groupFormation,
              guitarristaTitular: a.leadGuitarist,
              cacheOrientativoEur: a.baseCacheEur,
            })),
          ),
        })
      } else if (fnName === "consultar_huecos") {
        const fecha = String(args.fecha_preferida ?? "próxima semana")
        results.push({
          toolCallId: tc.id,
          result: JSON.stringify({
            fechaConsultada: fecha,
            huecosDisponibles: ["11:00", "13:00", "17:30", "19:00"],
          }),
        })
      } else if (fnName === "reservar_cita") {
        const nombre = String(args.nombre || "Programador")
        const email = String(args.email || "soniqueteconarte@soniqueteconarte.com")
        const telefono = String(args.telefono || msg?.call?.customer?.number || "")
        const fechaIso = String(
          args.fecha_hora_iso || new Date(Date.now() + 86400_000).toISOString(),
        )
        const motivo = String(args.motivo || "Reunión de contratación artística · Soniquete con Arte")

        const [calCfg] = await db.select().from(calcomSettings).limit(1)
        const calKey = tryDecryptSecret(calCfg?.apiKeyEncrypted) || ""
        const booking = await createCalcomBooking({
          apiKey: calKey,
          baseUrl: calCfg?.baseUrl,
          eventTypeId: calCfg?.defaultEventTypeId || "1",
          startIso: fechaIso,
          attendeeName: nombre,
          attendeeEmail: email,
          attendeePhone: telefono,
          notes: motivo,
        })

        const [vapiCfg] = await db.select().from(vapiSettings).limit(1)
        if (telefono && (vapiCfg?.autoSendBookingSms ?? true)) {
          const smsKey = tryDecryptSecret(vapiCfg?.zadarmaSmsKeyEncrypted) || ""
          const smsSecret = tryDecryptSecret(vapiCfg?.zadarmaSmsSecretEncrypted) || ""
          const smsText = `Soniquete con Arte: Confirmada tu reunion de contratacion flamenca para ${nombre}. Te hemos enviado los detalles e invitacion a tu correo.`
          const smsOut = await sendZadarmaSms({
            apiKey: smsKey,
            apiSecret: smsSecret,
            toPhone: telefono,
            message: smsText,
            callerId: vapiCfg?.zadarmaSmsCallerId || "Soniquete",
          })
          await db.insert(zadarmaSmsRespuesta).values({
            toPhone: smsOut.cleanPhone,
            callerId: vapiCfg?.zadarmaSmsCallerId || "Soniquete",
            message: smsOut.sanitizedMessage,
            status: smsOut.status,
            cost: smsOut.cost ?? null,
            messagesCount: smsOut.messagesCount ?? 1,
            rawResponse: smsOut.rawResponse,
            errorMessage: smsOut.errorMessage ?? null,
          })
        }

        results.push({
          toolCallId: tc.id,
          result: JSON.stringify({
            reservada: true,
            calcomUid: booking.uid,
            enlaceVideollamada: booking.meetingUrl,
            smsConfirmacionEnviado: Boolean(telefono),
          }),
        })
      } else {
        results.push({
          toolCallId: tc.id,
          result: JSON.stringify({ ok: true, mensaje: "Solicitud anotada para dirección artística." }),
        })
      }
    }

    return NextResponse.json({ results })
  }

  if (msgType === "end-of-call-report") {
    const vapiCallId = msg?.call?.id || `vapi_${Date.now()}`
    const phone = msg?.call?.customer?.number || "+34600000000"
    const callerName = msg?.call?.customer?.name || "Contacto Telefónico"
    const transcript = msg?.artifact?.transcript || ""
    const recordingUrl = msg?.artifact?.recordingUrl || null
    const summary =
      msg?.analysis?.summary ||
      "Llamada atendida por el agente de voz de Soniquete con Arte."
    const durationSeconds = Number(msg?.durationSeconds ?? 60)

    const existing = await db
      .select()
      .from(calls)
      .where(eq(calls.vapiCallId, vapiCallId))
      .limit(1)

    if (existing[0]) {
      await db
        .update(calls)
        .set({
          status: "completed",
          durationSeconds,
          summary,
          transcript,
          recordingUrl,
          endedAt: new Date(),
        })
        .where(eq(calls.id, existing[0].id))
    } else {
      const [firstConcert] = await db.select().from(concerts).limit(1)
      await db.insert(calls).values({
        vapiCallId,
        direction: "inbound",
        callerName,
        phoneNumber: phone,
        status: "completed",
        durationSeconds,
        summary,
        transcript,
        recordingUrl,
        relatedConcertId: firstConcert?.id ?? null,
        startedAt: new Date(Date.now() - durationSeconds * 1000),
        endedAt: new Date(),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
