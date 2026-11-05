import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/db"
import { concerts, eventProvisionalBookings } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const contactQuerySchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.string().trim().max(240).optional().nullable(),
  message: z.string().trim().min(1).max(4000),
  serviceId: z.string().optional().nullable(),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const parsed = contactQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos de consulta incompletos." },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    const input = parsed.data
    const lower = `${input.subject || ""} ${input.message}`.toLowerCase()
    const isBookingIntent =
      lower.includes("reserva") ||
      lower.includes("plaza") ||
      lower.includes("entrada") ||
      lower.includes("cita")

    if (isBookingIntent) {
      const [concert] = input.serviceId
        ? await db
            .select()
            .from(concerts)
            .where(eq(concerts.serviceId, input.serviceId))
            .limit(1)
        : await db.select().from(concerts).orderBy(desc(concerts.startsAt)).limit(1)

      if (concert) {
        await db.insert(eventProvisionalBookings).values({
          concertId: concert.id,
          attendeeName: input.fullName,
          attendeeEmail: input.email,
          attendeePhone: input.phone || null,
          seats: 1,
          status: "provisional",
          notes: `Solicitud desde Landing Web: ${input.message.slice(0, 300)}`,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        decision: isBookingIntent ? "AUTO_BOOKING" : "AUTO_INFO",
        message:
          "Tu solicitud ha sido recibida por el Agente Único de soniqueteflamenco.com y registrada en la Agenda.",
      },
      { headers: CORS_HEADERS },
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "No se pudo procesar la consulta." },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
