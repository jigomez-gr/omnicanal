import { eq, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { calls, vapiSettings } from "@/db/schema"
import { fetchVapiCall } from "@/lib/vapi/client"
import { tryDecryptSecret } from "@/server/crypto"
import { requireActor } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireActor()
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const [call] = await db
    .select()
    .from(calls)
    .where(or(eq(calls.id, id), eq(calls.vapiCallId, id)))
    .limit(1)

  if (!call) {
    return NextResponse.json({ error: "Llamada no encontrada" }, { status: 404 })
  }

  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey =
    tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || "868c4794-d264-4891-9d7e-b3fe5f33f2a1"

  let targetUrl = call.recordingUrl

  // Si no tiene recordingUrl pero tiene vapiCallId, intentar obtenerlo de VAPI en vivo
  if (!targetUrl && call.vapiCallId && !call.vapiCallId.startsWith("vapi_sim_")) {
    const vapiData = await fetchVapiCall(apiKey, call.vapiCallId)
    if (vapiData) {
      const resolvedUrl =
        vapiData.artifact?.recordingUrl ||
        vapiData.artifact?.stereoRecordingUrl ||
        vapiData.recordingUrl ||
        vapiData.stereoRecordingUrl ||
        null
      if (resolvedUrl) {
        targetUrl = resolvedUrl
        await db
          .update(calls)
          .set({
            recordingUrl: resolvedUrl,
            costCents: vapiData.cost ? Math.round(vapiData.cost * 100) : call.costCents,
            durationSeconds: vapiData.durationSeconds || call.durationSeconds,
            updatedAt: new Date(),
          })
          .where(eq(calls.id, call.id))
      }
    }
  }

  // Fallback a endpoint mono-recording de VAPI si no hay URL guardada
  if (!targetUrl && call.vapiCallId && !call.vapiCallId.startsWith("vapi_sim_")) {
    targetUrl = `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`
  }

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Grabación no disponible aún para esta llamada." },
      { status: 404 },
    )
  }

  try {
    const url = new URL(request.url)
    const isDownload = url.searchParams.get("download") === "1"

    const headers: Record<string, string> = {}
    if (targetUrl.includes("api.vapi.ai")) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    let upstream = await fetch(targetUrl, { headers, redirect: "follow" })

    // Si falló (p.ej. URL de S3 caducada con 403 Forbidden), refrescar con VAPI
    if (!upstream.ok && call.vapiCallId && !call.vapiCallId.startsWith("vapi_sim_")) {
      const vapiData = await fetchVapiCall(apiKey, call.vapiCallId)
      const freshUrl =
        vapiData?.artifact?.recordingUrl ||
        vapiData?.artifact?.stereoRecordingUrl ||
        vapiData?.recordingUrl ||
        vapiData?.stereoRecordingUrl ||
        null

      if (freshUrl && freshUrl !== targetUrl) {
        const freshHeaders: Record<string, string> = {}
        if (freshUrl.includes("api.vapi.ai")) {
          freshHeaders["Authorization"] = `Bearer ${apiKey}`
        }
        upstream = await fetch(freshUrl, { headers: freshHeaders, redirect: "follow" })
        if (upstream.ok) {
          targetUrl = freshUrl
          await db
            .update(calls)
            .set({ recordingUrl: freshUrl, updatedAt: new Date() })
            .where(eq(calls.id, call.id))
        }
      }

      // Si aún no responde, intentar con mono-recording de VAPI
      if (!upstream.ok) {
        const altUrl = `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`
        upstream = await fetch(altUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: "follow",
        })
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener el audio de la llamada desde VAPI." },
        { status: 502 },
      )
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg"
    const arrayBuffer = await upstream.arrayBuffer()
    const cleanPhone = (call.phoneNumber || call.vapiCallId || call.id).replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `grabacion-llamada-${cleanPhone}.mp3`

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Accept-Ranges": "bytes",
        "Content-Disposition": isDownload
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Error al transmitir la grabación" }, { status: 500 })
  }
}

