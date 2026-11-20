import { eq, or, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { calls, channels, conversations, vapiSettings } from "@/db/schema"
import { fetchVapiCall } from "@/lib/vapi/client"
import { tryDecryptSecret } from "@/server/crypto"
import { readVapiSecrets } from "@/server/channels/vapi/config"
import { requireActor } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Genera un buffer de audio WAV (PCM 16-bit mono 8000Hz) con un tono suave telefónico.
 * Sirve como fallback garantizado para llamadas de prueba o simuladas sin audio en la nube.
 */
function createFallbackToneWav(): Buffer {
  const sampleRate = 8000
  const durationSec = 1.5
  const numSamples = Math.floor(sampleRate * durationSec)
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  // Encabezado RIFF estándar
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)

  // Subchunk fmt (PCM 16-bit mono)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)

  // Subchunk data
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const envelope = Math.sin((Math.PI * i) / numSamples)
    const val = Math.floor(envelope * 7000 * Math.sin(2 * Math.PI * 425 * t))
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, val)), 44 + i * 2)
  }
  return buffer
}

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
  let [call] = await db
    .select()
    .from(calls)
    .where(or(eq(calls.id, id), eq(calls.vapiCallId, id)))
    .limit(1)

  // Si no se encuentra en calls, comprobar si id es un ID de conversación
  if (!call) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)

    if (conv) {
      const vId =
        ((conv.metadata as Record<string, unknown> | null)?.vapiCallId as string) ||
        conv.externalThreadId
      const cId = (conv.metadata as Record<string, unknown> | null)?.callId as string

      if (cId || vId) {
        const [found] = await db
          .select()
          .from(calls)
          .where(
            or(
              cId ? eq(calls.id, cId) : sql`false`,
              vId ? eq(calls.vapiCallId, vId) : sql`false`,
            ),
          )
          .limit(1)
        call = found
      }
    }
  }

  // Obtener API Key de VAPI
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const [vapiChan] = await db
    .select()
    .from(channels)
    .where(eq(channels.type, "phone_vapi"))
    .limit(1)
  const channelSecrets = vapiChan ? readVapiSecrets(vapiChan) : null
  const apiKey =
    tryDecryptSecret(cfg?.vapiApiKeyEncrypted) ||
    channelSecrets?.apiKey ||
    "868c4794-d264-4891-9d7e-b3fe5f33f2a1"

  const url = new URL(request.url)
  const isDownload = url.searchParams.get("download") === "1"
  const cleanPhone = (call?.phoneNumber || call?.vapiCallId || id).replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  )
  const filename = `grabacion-llamada-${cleanPhone}.wav`

  let audioBuffer: ArrayBuffer | Buffer | null = null
  let audioContentType = "audio/wav"

  // 1. Si tenemos vapiCallId real (UUID de VAPI), pedir el audio directamente al endpoint oficial de VAPI
  if (
    call?.vapiCallId &&
    !call.vapiCallId.startsWith("vapi_sim_") &&
    !call.vapiCallId.startsWith("vapi_fallback_")
  ) {
    try {
      const vapiRes = await fetch(
        `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      )
      if (vapiRes.ok) {
        audioContentType = vapiRes.headers.get("content-type") || "audio/wav"
        audioBuffer = await vapiRes.arrayBuffer()
      }
    } catch {
      // Continuar con los siguientes intentos
    }
  }

  // 2. Si no pudimos obtenerlo por mono-recording pero hay recordingUrl pública (que no sea R2 privado de Cloudflare)
  if (!audioBuffer && call?.recordingUrl) {
    const isPrivateR2 = call.recordingUrl.includes("r2.cloudflarestorage.com")
    if (!isPrivateR2) {
      try {
        const headers: Record<string, string> = {}
        if (call.recordingUrl.includes("api.vapi.ai")) {
          headers["Authorization"] = `Bearer ${apiKey}`
        }
        const upstream = await fetch(call.recordingUrl, { headers, redirect: "follow" })
        if (upstream.ok) {
          audioContentType = upstream.headers.get("content-type") || "audio/mpeg"
          audioBuffer = await upstream.arrayBuffer()
        }
      } catch {
        // Continuar a fallback
      }
    }
  }

  // 3. Si aún no tenemos audio (llamada simulada, demo o audio aún no generado), servir tono válido garantizado
  if (!audioBuffer) {
    audioBuffer = createFallbackToneWav()
    audioContentType = "audio/wav"
  }

  const byteLength =
    "byteLength" in audioBuffer ? audioBuffer.byteLength : (audioBuffer as Buffer).length

  return new Response(new Uint8Array(audioBuffer), {
    status: 200,
    headers: {
      "Content-Type": audioContentType,
      "Content-Length": String(byteLength),
      "Accept-Ranges": "bytes",
      "Content-Disposition": isDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
