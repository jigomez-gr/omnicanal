"use server"

import { revalidatePath } from "next/cache"
import {
  confirmEventProvisionalBooking,
  createArtistDigitalService,
  createEventProvisionalBooking,
  createFlamencoArtist,
  createFlamencoConcert,
  createFlamencoContract,
  createFlamencoMediaAsset,
  createFlamencoRepresentative,
  createFlamencoVenue,
  evaluateEventMinAttendeesCancellation,
  generateFullMediaPackAction,
  notifyProvisionalBookingsToConfirm,
  scrapeWebEntityForFlamenco,
  simulateAndScheduleConcertOffer,
} from "@/data/flamenco"
import { requireActor } from "@/server/session"

export async function createArtistAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoArtist(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/contactos")
  return created
}

export async function createMediaAssetAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoMediaAsset(actor, input)
  revalidatePath("/promocion")
  return created
}

export async function generateFullMediaPackServerAction(params: {
  artistId?: string
  concertId?: string
  subjectName: string
}) {
  const actor = await requireActor()
  const res = await generateFullMediaPackAction(actor, params)
  revalidatePath("/promocion")
  return res
}

export async function createRepresentativeAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoRepresentative(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/contactos")
  return created
}

export async function createVenueAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoVenue(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/contactos")
  return created
}

export async function createConcertAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoConcert(actor, input)
  revalidatePath("/promocion")
  return created
}

export async function createProvisionalBookingAction(input: unknown) {
  const actor = await requireActor()
  const res = await createEventProvisionalBooking(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/contactos")
  return res
}

export async function notifyProvisionalBookingsAction(input: unknown) {
  const actor = await requireActor()
  const res = await notifyProvisionalBookingsToConfirm(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/llamadas")
  return res
}

export async function confirmProvisionalBookingAction(bookingId: string) {
  const actor = await requireActor()
  const res = await confirmEventProvisionalBooking(actor, bookingId)
  revalidatePath("/promocion")
  return res
}

export async function evaluateMinAttendeesAction(concertId: string) {
  const actor = await requireActor()
  const res = await evaluateEventMinAttendeesCancellation(actor, concertId)
  revalidatePath("/promocion")
  return res
}

export async function createContractAction(input: unknown) {
  const actor = await requireActor()
  const created = await createFlamencoContract(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/pagos")
  return created
}

export async function simulateConcertOfferAction(input: unknown) {
  const actor = await requireActor()
  const res = await simulateAndScheduleConcertOffer(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/envios")
  return res
}

export async function scrapeWebEntityAction(input: unknown) {
  const actor = await requireActor()
  const res = await scrapeWebEntityForFlamenco(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/contactos")
  return res
}

export async function createArtistDigitalServiceAction(input: unknown) {
  const actor = await requireActor()
  const res = await createArtistDigitalService(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/pagos")
  return res
}
