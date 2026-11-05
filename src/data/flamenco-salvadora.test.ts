import { describe, expect, it } from "vitest"
import {
  createArtistDigitalService,
  createFlamencoArtist,
  createFlamencoConcert,
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
  evaluateInboundEmailForAutoBooking,
  getFlamencoHubSnapshot,
  getPublicUnifiedServicesCatalog,
  updateArtistDigitalService,
  updateFlamencoArtist,
  updateFlamencoConcert,
  updateFlamencoMediaAsset,
  updateFlamencoRepresentative,
  updateFlamencoVenue,
  updateWhatsappEvolutionGateway,
  upsertUnifiedCatalogService,
} from "@/data/flamenco"
import type { Actor } from "@/lib/permissions"

const ownerActor: Actor = {
  userId: "00000000-0000-4000-8000-000000000001",
  name: "Dirección Soniquete",
  role: "owner",
  channelIds: [],
}

describe("Promoción Artística: ABM de Maestros, Servicios Unificados en Agenda, Agente Único y 5 Canales", () => {
  it("ejecuta altas, modificaciones y bajas en los maestros y sincroniza los servicios en la Agenda y el catálogo público de la Landing", async () => {
    // 1. Representante ABM
    const rep = await createFlamencoRepresentative(ownerActor, {
      fullName: "Paco Montoya",
      agencyName: "Soniquete Booking",
      roleKind: "manager",
      commissionPercent: 15,
      city: "Madrid",
    })
    expect(rep.fullName).toBe("Paco Montoya")

    const updatedRep = await updateFlamencoRepresentative(ownerActor, {
      id: rep.id,
      fullName: "Paco Montoya (Director)",
      agencyName: "Soniquete Booking Madrid",
      roleKind: "manager",
      commissionPercent: 18,
      city: "Sevilla",
    })
    expect(updatedRep.commissionPercent).toBe(18)
    expect(updatedRep.city).toBe("Sevilla")

    // 2. Intérprete + Pack de Vídeos ABM
    const artist = await createFlamencoArtist(ownerActor, {
      artisticName: "Estrella de Triana",
      discipline: "cante",
      styles: ["Soleá", "Bulerías"],
      bringsGroup: true,
      groupFormation: "Cante, guitarra y compás",
      leadGuitarist: "Diego del Morón",
      baseCacheEur: 2400,
      minCacheEur: 1800,
      city: "Madrid",
      representativeId: rep.id,
      generateStandardMediaPack: true,
    })
    expect(artist.artisticName).toBe("Estrella de Triana")

    const updatedArtist = await updateFlamencoArtist(ownerActor, {
      id: artist.id,
      artisticName: "Estrella de Triana (Cantaora)",
      discipline: "cante",
      styles: ["Soleá", "Seguiriya"],
      bringsGroup: true,
      groupFormation: "Cuadro completo",
      leadGuitarist: "Diego del Morón",
      baseCacheEur: 2900,
      minCacheEur: 2000,
      city: "Madrid",
      representativeId: rep.id,
      generateStandardMediaPack: false,
    })
    expect(updatedArtist.baseCacheEur).toBe(2900)

    const media = await createFlamencoMediaAsset(ownerActor, {
      artistId: artist.id,
      pieceCode: "2_promo_horizontal",
      sourcePlatform: "plataforma",
      title: "Promo Horizontal 1 min · Estrella de Triana",
      fileUrl: "/api/media/stream/services/act-1-presentacion.mp4",
    })
    const updatedMedia = await updateFlamencoMediaAsset(ownerActor, {
      id: media.id,
      artistId: artist.id,
      pieceCode: "2_promo_horizontal",
      sourcePlatform: "plataforma",
      title: "Promo Horizontal HD Editada · Estrella de Triana",
      fileUrl: "/api/media/stream/services/act-2-presentacion.mp4",
    })
    expect(updatedMedia.title).toContain("Editada")
    await deleteFlamencoMediaAsset(ownerActor, media.id)

    // 3. Sala / Ateneo ABM
    const venue = await createFlamencoVenue(ownerActor, {
      name: "Ateneo Flamenco de Madrid",
      kind: "ateneo",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      capacity: 250,
      typicalBudgetEur: 3000,
    })
    const updatedVenue = await updateFlamencoVenue(ownerActor, {
      id: venue.id,
      name: "Ateneo Flamenco de Madrid (Auditorio)",
      kind: "ateneo",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      capacity: 320,
      typicalBudgetEur: 3400,
    })
    expect(updatedVenue.capacity).toBe(320)

    // 4. Concierto / Evento sincronizado con Agenda (tabla services)
    const concert = await createFlamencoConcert(ownerActor, {
      title: "Recital Jondo en el Ateneo",
      eventKind: "concierto",
      artistId: artist.id,
      venueId: venue.id,
      dateAndPlaceTbd: false,
      provisionalBookingsOpen: true,
      cancelIfBelowMinAttendees: true,
      minAttendees: 60,
      currentAttendees: 20,
      agreedCacheEur: 3000,
      ticketPriceEur: 28,
      createCalcomMeeting: false,
      generateStandardMediaPack: false,
    })
    expect(concert.title).toBe("Recital Jondo en el Ateneo")

    const updatedConcert = await updateFlamencoConcert(ownerActor, {
      id: concert.id,
      title: "Recital Jondo en el Ateneo · Edición Especial",
      eventKind: "concierto",
      artistId: artist.id,
      venueId: venue.id,
      dateAndPlaceTbd: true,
      provisionalBookingsOpen: true,
      cancelIfBelowMinAttendees: true,
      minAttendees: 80,
      currentAttendees: 35,
      agreedCacheEur: 3200,
      ticketPriceEur: 32,
      status: "provisional",
      createCalcomMeeting: false,
      generateStandardMediaPack: false,
    })
    expect(updatedConcert.ticketPriceEur).toBe(32)
    expect(updatedConcert.dateAndPlaceTbd).toBe(true)

    // 5. Servicio unificado en Agenda + Catálogo Público para la Landing (/api/widget/services)
    const customService = await upsertUnifiedCatalogService(ownerActor, {
      name: "Viaje Cultural Flamenco a Jerez (Reserva Provisional)",
      category: "Viajes Culturales Flamencos",
      serviceType: "event",
      durationMin: 180,
      price: 195,
      description: "Convivencia flamenca con ruta por peñas históricas.",
      sinfechadefinitiva: true,
      textosinfechadefinitiva: "Reserva provisional sin fecha fija con aviso automático.",
      flyerUrl: "/api/media/stream/flyers/flyer-generico-horizontal.png",
      videoUrl: "/api/media/stream/services/act-1-presentacion.mp4",
      minPeople: 20,
      maxPeople: 45,
      active: true,
      artistId: artist.id,
      venueId: venue.id,
    })
    expect(customService.sinfechadefinitiva).toBe(true)

    const publicCatalog = await getPublicUnifiedServicesCatalog()
    expect(publicCatalog.success).toBe(true)
    expect(
      publicCatalog.services.some((s) =>
        s.name.includes("Viaje Cultural Flamenco a Jerez"),
      ),
    ).toBe(true)
    expect(
      publicCatalog.services.some((s) =>
        s.name.includes("Recital Jondo en el Ateneo · Edición Especial"),
      ),
    ).toBe(true)

    // 6. Pasarela WhatsApp Evolution API / YCloud / Meta y Evaluador IA de Correo (AUTO_BOOKING)
    const gw = await updateWhatsappEvolutionGateway(ownerActor, {
      provider: "evolution",
      whatsappNumber: "+34648212650",
      evolutionApiUrl: "https://evolution.soniqueteconarte.jigretera.com",
      evolutionInstanceName: "soniquete_flamenco",
      evolutionApiKey: "evo_secret_test_key",
      emailAutoBookingEnabled: true,
    })
    expect(gw.provider).toBe("evolution")

    const emailEval = await evaluateInboundEmailForAutoBooking(ownerActor, {
      senderName: "Peña Flamenca El Compás",
      senderEmail: "reservas@elcompas.es",
      senderPhone: "+34611223344",
      subject: "Reserva de 4 entradas para el Recital Jondo",
      body: "Hola, queremos reservar 4 plazas para el recital en el Ateneo.",
      concertId: concert.id,
      seats: 4,
    })
    expect(emailEval.decision).toBe("AUTO_BOOKING")

    // 7. Pack de Servicios Digitales ABM
    const digitalPack = await createArtistDigitalService(ownerActor, {
      artistId: artist.id,
      packName: "Pack Estrella Flamenca 360º",
      status: "activo",
      setupFeeEur: 950,
      monthlyFeeEur: 190,
    })
    const updatedDigitalPack = await updateArtistDigitalService(ownerActor, {
      id: digitalPack.id,
      artistId: artist.id,
      packName: "Pack Estrella Flamenca 360º Plus",
      status: "entregado",
      setupFeeEur: 950,
      monthlyFeeEur: 210,
    })
    expect(updatedDigitalPack.monthlyFeeEur).toBe(210)

    const snapshot = await getFlamencoHubSnapshot(ownerActor)
    expect(snapshot.whatsappGateway.provider).toBe("evolution")
    expect(snapshot.catalogServices.length).toBeGreaterThanOrEqual(2)

    // 8. Bajas (Delete)
    await deleteArtistDigitalService(ownerActor, digitalPack.id)
    await deleteUnifiedCatalogService(ownerActor, customService.id)
    await deleteFlamencoConcert(ownerActor, concert.id)
    await deleteFlamencoVenue(ownerActor, venue.id)
    await deleteFlamencoArtist(ownerActor, artist.id)
    await deleteFlamencoRepresentative(ownerActor, rep.id)
  })
})
