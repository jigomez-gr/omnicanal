import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { calls } from "@/db/schema"
import { requireActor } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireActor()
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const [call] = await db.select().from(calls).where(eq(calls.id, id)).limit(1)
  if (!call || !call.recordingUrl) {
    return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 })
  }

  try {
    const upstream = await fetch(call.recordingUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: "No se pudo obtener el audio remoto" }, { status: 502 })
    }
    const contentType = upstream.headers.get("content-type") || "audio/mpeg"
    const arrayBuffer = await upstream.arrayBuffer()
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Error al transmitir la grabación" }, { status: 500 })
  }
}
