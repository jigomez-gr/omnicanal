"use server"

import { revalidatePath } from "next/cache"
import {
  connectZadarmaSipTrunkAction,
  launchOutboundVapiCallAction,
  sendZadarmaEchoTestCallAction,
  sendZadarmaSmsFromDashboard,
  syncFlamencoToolsAction,
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

export async function connectZadarmaSipTrunkServerAction(params?: {
  authUsername?: string
  authPassword?: string
  gateway?: string
}) {
  const actor = await requireActor()
  const res = await connectZadarmaSipTrunkAction(actor, params ?? {})
  revalidatePath("/llamadas")
  return res
}

export async function sendZadarmaEchoTestServerAction() {
  const actor = await requireActor()
  const res = await sendZadarmaEchoTestCallAction(actor)
  revalidatePath("/llamadas")
  return res
}

export async function syncFlamencoToolsServerAction() {
  const actor = await requireActor()
  const res = await syncFlamencoToolsAction(actor)
  revalidatePath("/llamadas")
  return res
}

