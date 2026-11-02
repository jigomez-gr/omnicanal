"use server"

import { revalidatePath } from "next/cache"
import {
  createPaymentOrLink,
  markPaymentRecordPaid,
  testCalcomConfigAction,
  updateCalcomConfig,
  updatePaymentConfig,
} from "@/data/flamenco"
import { requireActor } from "@/server/session"

export async function saveStripeConfigServerAction(input: unknown) {
  const actor = await requireActor()
  const res = await updatePaymentConfig(actor, input)
  revalidatePath("/pagos")
  revalidatePath("/ajustes")
  return res
}

export async function createPaymentOrLinkServerAction(input: unknown) {
  const actor = await requireActor()
  const res = await createPaymentOrLink(actor, input)
  revalidatePath("/pagos")
  return res
}

export async function markPaymentPaidServerAction(paymentId: string) {
  const actor = await requireActor()
  const res = await markPaymentRecordPaid(actor, paymentId)
  revalidatePath("/pagos")
  revalidatePath("/promocion")
  return res
}

export async function saveCalcomConfigServerAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateCalcomConfig(actor, input)
  revalidatePath("/pagos")
  revalidatePath("/ajustes")
  return res
}

export async function testCalcomConnectionServerAction() {
  const actor = await requireActor()
  return testCalcomConfigAction(actor)
}
