"use server"

import { revalidatePath } from "next/cache"
import {
  createFlamencoConcert,
  sendZadarmaSmsFromDashboard,
  testCalcomConfigAction,
  updateCalcomConfig,
} from "@/data/flamenco"
import { requireActor } from "@/server/session"

export async function saveCalcomConfigOnlineAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateCalcomConfig(actor, input)
  revalidatePath("/citas-online")
  revalidatePath("/pagos")
  revalidatePath("/agenda")
  return res
}

export async function testCalcomConnectionOnlineAction() {
  const actor = await requireActor()
  return testCalcomConfigAction(actor)
}

export async function createOnlineMeetingCalcomAction(input: {
  title: string
  artistId: string
  venueId?: string | null
  startsAtIso: string
  durationMinutes: number
  attendeePhone?: string | null
  sendSmsConfirmation?: boolean
  notes?: string | null
}) {
  const actor = await requireActor()
  const created = await createFlamencoConcert(actor, {
    title: input.title,
    eventKind: "encuentro_artista",
    artistId: input.artistId,
    venueId: input.venueId || null,
    startsAtIso: input.startsAtIso,
    durationMinutes: input.durationMinutes,
    status: "confirmado",
    createCalcomMeeting: true,
    generateStandardMediaPack: false,
    notes: input.notes || "Cita Online sincronizada con Cal.com API v2",
  })

  if (input.sendSmsConfirmation && input.attendeePhone?.trim()) {
    const whenText = new Date(input.startsAtIso).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    })
    await sendZadarmaSmsFromDashboard(actor, {
      toPhone: input.attendeePhone.trim(),
      message: `Soniquete Flamenco: Confirmada tu cita virtual Cal.com (${input.title}) para el ${whenText}. Te hemos enviado el enlace de videollamada a tu correo.`,
    })
  }

  revalidatePath("/citas-online")
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return created
}
