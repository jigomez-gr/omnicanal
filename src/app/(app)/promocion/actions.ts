"use server"

import { revalidatePath } from "next/cache"
import {
  configureHostingerDomainEmail,
  confirmEventProvisionalBooking,
  createArtistDigitalService,
  createEventProvisionalBooking,
  createFlamencoArtist,
  createFlamencoConcert,
  createFlamencoContract,
  createFlamencoMediaAsset,
  createFlamencoRepresentative,
  createFlamencoVenue,
  deleteArtistDigitalService,
  deleteFlamencoArtist,
  deleteFlamencoConcert,
  deleteFlamencoMediaAsset,
  deleteFlamencoRepresentative,
  deleteFlamencoVenue,
  deleteUnifiedCatalogService,
  evaluateEventMinAttendeesCancellation,
  evaluateInboundEmailForAutoBooking,
  generateFullMediaPackAction,
  notifyProvisionalBookingsToConfirm,
  scrapeWebEntityForFlamenco,
  simulateAndScheduleConcertOffer,
  updateArtistDigitalService,
  updateFlamencoArtist,
  updateFlamencoConcert,
  updateFlamencoMediaAsset,
  updateFlamencoRepresentative,
  updateFlamencoVenue,
  updateWhatsappEvolutionGateway,
  upsertUnifiedCatalogService,
} from "@/data/flamenco"
import { requireActor } from "@/server/session"

export async function configureHostingerEmailAction(input: unknown) {
  const actor = await requireActor()
  const res = await configureHostingerDomainEmail(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/canales")
  return res
}

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

export async function updateArtistAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateFlamencoArtist(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function deleteArtistAction(artistId: string) {
  const actor = await requireActor()
  const res = await deleteFlamencoArtist(actor, artistId)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function updateMediaAssetAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateFlamencoMediaAsset(actor, input)
  revalidatePath("/promocion")
  return res
}

export async function deleteMediaAssetAction(mediaId: string) {
  const actor = await requireActor()
  const res = await deleteFlamencoMediaAsset(actor, mediaId)
  revalidatePath("/promocion")
  return res
}

export async function updateRepresentativeAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateFlamencoRepresentative(actor, input)
  revalidatePath("/promocion")
  return res
}

export async function deleteRepresentativeAction(repId: string) {
  const actor = await requireActor()
  const res = await deleteFlamencoRepresentative(actor, repId)
  revalidatePath("/promocion")
  return res
}

export async function updateVenueAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateFlamencoVenue(actor, input)
  revalidatePath("/promocion")
  return res
}

export async function deleteVenueAction(venueId: string) {
  const actor = await requireActor()
  const res = await deleteFlamencoVenue(actor, venueId)
  revalidatePath("/promocion")
  return res
}

export async function updateConcertAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateFlamencoConcert(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function deleteConcertAction(concertId: string) {
  const actor = await requireActor()
  const res = await deleteFlamencoConcert(actor, concertId)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function updateArtistDigitalServiceAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateArtistDigitalService(actor, input)
  revalidatePath("/promocion")
  return res
}

export async function deleteArtistDigitalServiceAction(serviceId: string) {
  const actor = await requireActor()
  const res = await deleteArtistDigitalService(actor, serviceId)
  revalidatePath("/promocion")
  return res
}

export async function upsertCatalogServiceAction(input: unknown) {
  const actor = await requireActor()
  const res = await upsertUnifiedCatalogService(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function deleteCatalogServiceAction(serviceId: string) {
  const actor = await requireActor()
  const res = await deleteUnifiedCatalogService(actor, serviceId)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

export async function updateWhatsappGatewayAction(input: unknown) {
  const actor = await requireActor()
  const res = await updateWhatsappEvolutionGateway(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/canales")
  return res
}

export async function evaluateEmailAutoBookingAction(input: unknown) {
  const actor = await requireActor()
  const res = await evaluateInboundEmailForAutoBooking(actor, input)
  revalidatePath("/promocion")
  revalidatePath("/agenda")
  return res
}

