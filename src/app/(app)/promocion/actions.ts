"use server"

import { revalidatePath } from "next/cache"
import {
  createArtistDigitalService,
  createFlamencoArtist,
  createFlamencoConcert,
  createFlamencoContract,
  createFlamencoMediaAsset,
  createFlamencoRepresentative,
  createFlamencoVenue,
  generateFullMediaPackAction,
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
