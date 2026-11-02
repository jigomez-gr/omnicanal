"use server"

import { revalidatePath } from "next/cache"
import {
  launchOutboundVapiCallAction,
  sendZadarmaSmsFromDashboard,
  updateVapiAndZadarmaConfig,
} from "@/data/flamenco"
import { requireActor } from "@/server/session"

export async function saveVapiZadarmaSettingsAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateVapiAndZadarmaConfig(actor, input)
  revalidatePath("/llamadas")
  revalidatePath("/ajustes")
  return res
}

export async function triggerOutboundCallServerAction(params: {
  phoneNumber: string
  callerName?: string
}) {
  const actor = await requireActor()
  const res = await launchOutboundVapiCallAction(actor, params)
  revalidatePath("/llamadas")
  return res
}

export async function sendZadarmaSmsServerAction(params: {
  toPhone: string
  message: string
  relatedCallId?: string
}) {
  const actor = await requireActor()
  const res = await sendZadarmaSmsFromDashboard(actor, params)
  revalidatePath("/llamadas")
  return res
}
