import { createHmac } from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { FLAMENCO_MEDIA_PIECES } from "@/lib/flamenco/catalog"
import { verifyStripeWebhookSignature } from "@/lib/stripe/client"
import {
  generateZadarmaAuthHeader,
  sanitizeZadarmaSmsMessage,
} from "@/lib/zadarma/client"
import { AuthError } from "@/server/errors"
import { createBusiness, createUser, type TestUser } from "@/test/factories"
import {
  confirmEventProvisionalBooking,
  createArtistDigitalService,
  createEventProvisionalBooking,
  createFlamencoArtist,
  createFlamencoConcert,
  createFlamencoContract,
  createFlamencoMediaAsset,
  createFlamencoVenue,
  evaluateEventMinAttendeesCancellation,
  getCalcomConfig,
  getFlamencoHubSnapshot,
  getPaymentsDashboard,
  getVapiAndCallsDashboard,
  notifyProvisionalBookingsToConfirm,
  scrapeWebEntityForFlamenco,
  sendZadarmaSmsFromDashboard,
  simulateAndScheduleConcertOffer,
  updateCalcomConfig,
  updatePaymentConfig,
  updateVapiAndZadarmaConfig,
} from "./flamenco"

let owner: TestUser
let viewer: TestUser
let agent: TestUser

beforeAll(async () => {
  await createBusiness()
  owner = await createUser("owner")
  viewer = await createUser("viewer")
  agent = await createUser("agent")
})

describe("Agencia de Promoción Flamenca, Cal.com, Stripe y VAPI/Zadarma", () => {
  it("[FLA-01] [FLA-02] crea intérprete con biografía, estilos, grupo, guitarrista y las 12 salidas multimedia (.mp4, portadas, miniatura y flyers)", async () => {
    const artist = await createFlamencoArtist(owner.actor, {
      artisticName: "Estrella de Triana",
      legalName: "Estrella Jiménez",
      discipline: "cante",
      biography: "Especialista en cantes a compás y recital clásico.",
      styles: ["Soleá", "Bulerías", "Tangos"],
      bringsGroup: true,
      groupFormation: "Cante, guitarra titular, 2 palmeros y baile",
      leadGuitarist: "Diego del Morón",
      alternateGuitarists: ["Paco Heredia"],
      baseCacheEur: 2500,
      minCacheEur: 1800,
      city: "Sevilla",
      email: "estrella@soniqueteconarte.com",
      phone: "+34699112233",
      generateStandardMediaPack: true,
    })

    expect(artist.artisticName).toBe("Estrella de Triana")
    expect(artist.leadGuitarist).toBe("Diego del Morón")
    expect(artist.bringsGroup).toBe(true)

    const snapshot = await getFlamencoHubSnapshot(viewer.actor)
    const mediaForArtist = snapshot.mediaAssets.filter((m) => m.artistId === artist.id)
    expect(mediaForArtist.length).toBe(FLAMENCO_MEDIA_PIECES.length)
    expect(mediaForArtist.some((m) => m.pieceCode === "1_completo_horizontal")).toBe(true)
    expect(mediaForArtist.some((m) => m.pieceCode === "7_reel_instagram")).toBe(true)
    expect(mediaForArtist.some((m) => m.pieceCode === "6_vertical_whatsapp")).toBe(true)
  })

  it("[FLA-04] [FLA-05] [FLA-06] crea sala, concierto con Cal.com, contrato con Stripe y simula oferta generando campaña en Envíos", async () => {
    const artist = await createFlamencoArtist(owner.actor, {
      artisticName: "Curro del Albaicín",
      discipline: "toque",
      leadGuitarist: "Curro del Albaicín",
      baseCacheEur: 1900,
      generateStandardMediaPack: true,
    })

    const venue = await createFlamencoVenue(owner.actor, {
      name: "Ateneo Flamenco de Cámara",
      kind: "ateneo",
      city: "Madrid",
      capacity: 250,
      typicalBudgetEur: 2400,
      programmerName: "Lucía Prado",
      email: "programacion@ateneoflamenco-test.es",
      phone: "+34910112233",
    })

    const concert = await createFlamencoConcert(owner.actor, {
      title: "Recital de Guitarra Flamenca en el Ateneo",
      artistId: artist.id,
      venueId: venue.id,
      startsAtIso: new Date(Date.now() + 7 * 86400_000).toISOString(),
      agreedCacheEur: 2100,
      guitaristName: "Curro del Albaicín",
      createCalcomMeeting: true,
      generateStandardMediaPack: true,
    })

    expect(concert.calcomMeetingUrl).toContain("https://app.cal.com/video/")

    const contract = await createFlamencoContract(owner.actor, {
      code: "CNT-TEST-101",
      concertId: concert.id,
      artistId: artist.id,
      venueId: venue.id,
      totalAmountEur: 2100,
      advancePercent: 50,
      agencyCommissionPercent: 15,
    })

    expect(contract.stripePaymentLinkUrl).toBeTruthy()

    const offerRes = await simulateAndScheduleConcertOffer(owner.actor, {
      title: "Oferta Gira Ateneos · Curro del Albaicín",
      artistId: artist.id,
      venueId: venue.id,
      concertId: concert.id,
      targetVenueKind: "ateneo",
      proposedDateText: "Viernes 20 de Noviembre · 20:30 h",
      proposedCacheEur: 2100,
      includesGroup: true,
      guitaristName: "Curro del Albaicín",
      channels: ["whatsapp", "telegram", "email"],
      createCampaignInEnvios: true,
    })

    expect(offerRes.campaignId).toBeTruthy()
    expect(offerRes.offer.status).toBe("pasada_a_envios")
    expect(offerRes.offer.whatsappPreview).toContain("Curro del Albaicín")
  })

  it("[FLA-07] [FLA-08] [FLA-09] capta salas y artistas desde su URL web y crea pack de servicios digitales", async () => {
    const scrapedVenue = await scrapeWebEntityForFlamenco(owner.actor, {
      targetType: "venue",
      websiteUrl: "https://tablao-las-carboneras-demo.es",
      fallbackCity: "Madrid",
      venueKind: "tablao",
    })
    expect(scrapedVenue.targetType).toBe("venue")
    expect(scrapedVenue.contactId).toBeTruthy()

    const scrapedArtist = await scrapeWebEntityForFlamenco(owner.actor, {
      targetType: "artist",
      websiteUrl: "https://bailaora-macarena-demo.com",
      fallbackCity: "Sevilla",
      artistDiscipline: "baile",
    })
    expect(scrapedArtist.targetType).toBe("artist")

    const digitalPack = await createArtistDigitalService(owner.actor, {
      artistId: scrapedArtist.entityId,
      packName: "Pack Estrella Flamenca 360º",
      landingDomain: "macarena.soniqueteconarte.com",
      includesLanding: true,
      includesAiAgent: true,
      includesWhatsappChannel: true,
      includesTelegramBot: true,
      includesInstagramSetup: true,
      includesYoutubeChannel: true,
      includesNineVideosPack: true,
      setupFeeEur: 950,
      monthlyFeeEur: 190,
    })
    expect(digitalPack.telegramBotUsername).toBe("@soniqueteconarteflamencoMadrid")
  })

  it("[CAL-01] [PAG-01] [VAP-01] cifra secretos con APP_ENCRYPTION_KEY y nunca los devuelve en claro", async () => {
    const cal = await updateCalcomConfig(owner.actor, {
      enabled: true,
      apiKey: "cal_live_secret_key_987654",
      baseUrl: "https://api.cal.com/v2",
      defaultEventTypeId: "654321",
      autoSyncBookings: true,
    })
    expect(cal.hasApiKey).toBe(true)
    expect(cal.maskedApiKey).toBe("••••7654")

    const pay = await updatePaymentConfig(owner.actor, {
      stripeEnabled: true,
      publishableKey: "pk_live_123",
      secretKey: "sk_live_super_secret_1122",
      webhookSecret: "whsec_webhook_secret_3344",
      enableCardAndWallets: true,
      enableBizum: true,
      currency: "EUR",
    })
    expect(pay.config.maskedSecretKey).toBe("••••1122")
    expect(pay.config.maskedWebhookSecret).toBe("••••3344")

    const vapi = await updateVapiAndZadarmaConfig(owner.actor, {
      vapiEnabled: true,
      vapiApiKey: "vapi_private_key_5566",
      vapiAssistantId: "asst_flamenco_1",
      zadarmaPhoneNumber: "+34919931525",
      zadarmaSipServer: "sip.zadarma.com",
      voiceProvider: "11labs",
      voiceId: "791d5162-d5eb-40f0-8189-f19db44611d8",
      transcriberProvider: "deepgram",
      transcriberModel: "nova-2",
      transcriberLanguage: "es",
      llmModel: "gpt-4o-mini",
      temperature: "0.3",
      zadarmaSmsKey: "zd_key_7788",
      zadarmaSmsSecret: "zd_secret_9900",
      zadarmaSmsCallerId: "Soniquete",
      autoSendBookingSms: true,
    })
    expect(vapi.config.maskedVapiApiKey).toBe("••••5566")
    expect(vapi.config.maskedZadarmaSmsKey).toBe("••••7788")
    expect(vapi.config.maskedZadarmaSmsSecret).toBe("••••9900")
  })

  it("[VAP-03] verifica firma Zadarma HMAC-SHA1, sanitización de SMS en España y firma Stripe Webhook", async () => {
    const sanitized = sanitizeZadarmaSmsMessage(
      "Hola! Tu reunión está en https://app.cal.com/video/abc y en soniqueteconarte.com",
    )
    expect(sanitized).not.toContain("https://")
    expect(sanitized).not.toContain(".com")
    expect(sanitized).toContain("nuestra web")

    const { authHeader, queryString } = generateZadarmaAuthHeader({
      methodPath: "/v1/sms/send/",
      queryParams: {
        caller_id: "Soniquete",
        message: "Confirmacion reunion",
        number: "34600112233",
      },
      apiKey: "testKey",
      apiSecret: "testSecret",
    })
    expect(authHeader.startsWith("testKey:")).toBe(true)
    expect(queryString).toContain("caller_id=Soniquete")

    // Prueba de envío de SMS desde el panel (modo simulación sin claves externas)
    await updateVapiAndZadarmaConfig(owner.actor, {
      vapiEnabled: true,
      zadarmaPhoneNumber: "+34919931525",
      zadarmaSipServer: "sip.zadarma.com",
      voiceProvider: "11labs",
      voiceId: "791d5162-d5eb-40f0-8189-f19db44611d8",
      transcriberProvider: "deepgram",
      transcriberModel: "nova-2",
      transcriberLanguage: "es",
      llmModel: "gpt-4o-mini",
      temperature: "0.3",
      zadarmaSmsCallerId: "Soniquete",
      autoSendBookingSms: true,
    })

    const smsRes = await sendZadarmaSmsFromDashboard(owner.actor, {
      toPhone: "611223344",
      message: "Reserva confirmada en https://soniqueteconarte.com",
    })
    expect(smsRes.log.toPhone).toBe("34611223344")
    expect(smsRes.log.message).not.toContain("https://")

    // Verificación de firma de webhook de Stripe
    const rawBody = JSON.stringify({ type: "checkout.session.completed" })
    const ts = Math.floor(Date.now() / 1000)
    const secret = "whsec_test_stripe_secret"
    const sig = createHmac("sha256", secret)
      .update(`${ts}.${rawBody}`, "utf8")
      .digest("hex")

    expect(
      verifyStripeWebhookSignature({
        rawBody,
        signatureHeader: `t=${ts},v1=${sig}`,
        webhookSecret: secret,
      }),
    ).toBe(true)
  })

  it("impide que el rol agent o viewer modifique datos o credenciales", async () => {
    await expect(
      createFlamencoArtist(viewer.actor, { artisticName: "No permitido" }),
    ).rejects.toBeInstanceOf(AuthError)

    await expect(
      updatePaymentConfig(viewer.actor, { stripeEnabled: false, currency: "EUR" }),
    ).rejects.toBeInstanceOf(AuthError)

    await expect(getFlamencoHubSnapshot(agent.actor)).rejects.toBeInstanceOf(AuthError)
    // Pero viewer sí puede consultar los paneles
    expect(await getCalcomConfig(viewer.actor)).toBeDefined()
    expect(await getPaymentsDashboard(viewer.actor)).toBeDefined()
    expect(await getVapiAndCallsDashboard(viewer.actor)).toBeDefined()
  })

  it("[FLA-03] [FLA-06] [FLA-10] vídeos de conciertos en YouTube y formatos abiertos en la ficha del artista, eventos no-concierto (viajes, conferencias, entrevistas), reservas provisionales con fecha/lugar por definir y cancelación automática por mínimo de asistentes", async () => {
    const artist = await createFlamencoArtist(owner.actor, {
      artisticName: "Paco de Lavapiés",
      discipline: "toque",
      leadGuitarist: "Paco de Lavapiés",
      baseCacheEur: 1700,
      generateStandardMediaPack: false,
    })

    // 1. Crear evento tipo viaje_flamenco sin fecha ni lugar aún definidos, con reservas provisionales y mínimo de asistentes
    const viaje = await createFlamencoConcert(owner.actor, {
      title: "Viaje Cultural Flamenco a Jerez y Barrios de Cante con Paco de Lavapiés",
      eventKind: "viaje_flamenco",
      artistId: artist.id,
      venueId: null,
      startsAtIso: null,
      dateAndPlaceTbd: true,
      provisionalBookingsOpen: true,
      autoNotifyToConfirm: true,
      cancelIfBelowMinAttendees: true,
      minAttendees: 20,
      currentAttendees: 0,
      agreedCacheEur: 2800,
      ticketPriceEur: 180,
      guitaristName: "Paco de Lavapiés",
      status: "provisional",
      createCalcomMeeting: false,
      generateStandardMediaPack: false,
    })

    expect(viaje.eventKind).toBe("viaje_flamenco")
    expect(viaje.dateAndPlaceTbd).toBe(true)
    expect(viaje.provisionalBookingsOpen).toBe(true)
    expect(viaje.cancelIfBelowMinAttendees).toBe(true)
    expect(viaje.minAttendees).toBe(20)
    expect(viaje.venueId).toBeNull()

    // 2. Asociar al evento y al artista un vídeo de concierto en YouTube y una pieza multimedia personalizada abierta ("custom_otro")
    const ytMedia = await createFlamencoMediaAsset(owner.actor, {
      artistId: artist.id,
      concertId: viaje.id,
      pieceCode: "1_completo_horizontal",
      sourcePlatform: "youtube",
      title: "Concierto en directo en YouTube · Paco de Lavapiés",
      fileUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      durationSeconds: 480,
      releasePhase: "referencia_web",
    })
    expect(ytMedia.sourcePlatform).toBe("youtube")
    expect(ytMedia.youtubeVideoId).toBe("M7lc1UVf-VE")

    const customMedia = await createFlamencoMediaAsset(owner.actor, {
      artistId: artist.id,
      concertId: viaje.id,
      pieceCode: "custom_otro",
      customPieceLabel: "Podcast y Entrevista Acústica en Radio Clásica",
      sourcePlatform: "plataforma",
      title: "Entrevista Pública y Toque en Directo",
      fileUrl: "https://cdn.soniqueteconarte.com/media/paco/entrevista-radio.mp4",
      durationSeconds: 600,
      releasePhase: "permanente",
    })
    expect(customMedia.pieceCode).toBe("custom_otro")
    expect(customMedia.customPieceLabel).toBe("Podcast y Entrevista Acústica en Radio Clásica")

    // 3. Registrar reservas provisionales y comprobar que suman plazas al evento
    const b1 = await createEventProvisionalBooking(owner.actor, {
      concertId: viaje.id,
      attendeeName: "Elena Gómez",
      attendeeEmail: "elena@test-flamenco.es",
      attendeePhone: "+34611223344",
      seats: 5,
      notes: "Pendiente de saber el fin de semana exacto",
    })
    const b2 = await createEventProvisionalBooking(owner.actor, {
      concertId: viaje.id,
      attendeeName: "Peña El Compás",
      attendeeEmail: "pena@test-flamenco.es",
      attendeePhone: "+34655667788",
      seats: 4,
    })
    expect(b1.booking.status).toBe("provisional")
    expect(b2.booking.status).toBe("provisional")
    expect(b2.currentAttendees).toBe(9)

    // 4. Enviar aviso automático para que confirmen su reserva provisional una vez fijada fecha y lugar
    const notifyRes = await notifyProvisionalBookingsToConfirm(owner.actor, {
      concertId: viaje.id,
      confirmedStartsAtIso: new Date(Date.now() + 25 * 86400_000).toISOString(),
    })
    expect(notifyRes.notifiedCount).toBe(2)

    // 5. Confirmar una de las reservas provisionales
    const confirmedBooking = await confirmEventProvisionalBooking(owner.actor, b1.booking.id)
    expect(confirmedBooking.status).toBe("confirmada")
    expect(confirmedBooking.confirmedAt).toBeTruthy()

    // 6. Evaluar la regla "Si no se llega al número de asistentes se cancela" (9 plazas < 20 mínimo -> se cancela)
    const evalRes = await evaluateEventMinAttendeesCancellation(owner.actor, viaje.id)
    expect(evalRes.cancelled).toBe(true)
    expect(evalRes.concert.status).toBe("cancelado")
    expect(evalRes.concert.currentAttendees).toBe(9)
    expect(evalRes.concert.minAttendees).toBe(20)

    // Comprobar que el snapshot devuelve los vídeos de conciertos del artista (YouTube y custom) y las reservas provisionales
    const snapshot = await getFlamencoHubSnapshot(viewer.actor)
    const artistAllVideos = snapshot.mediaAssets.filter(
      (m) => m.artistId === artist.id || m.concertId === viaje.id,
    )
    expect(artistAllVideos.some((m) => m.youtubeVideoId === "M7lc1UVf-VE")).toBe(true)
    expect(
      artistAllVideos.some(
        (m) =>
          m.pieceCode === "custom_otro" &&
          m.customPieceLabel === "Podcast y Entrevista Acústica en Radio Clásica",
      ),
    ).toBe(true)
    expect(
      snapshot.provisionalBookings.filter((b) => b.concertId === viaje.id).length,
    ).toBe(2)
  })
})
