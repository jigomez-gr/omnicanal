import type { Executor } from "@/db"
import {
  artistDigitalServices,
  artists,
  calcomSettings,
  calls,
  concertOffers,
  concerts,
  contracts,
  eventProvisionalBookings,
  flamencoMediaAssets,
  paymentRecords,
  paymentSettings,
  representatives,
  vapiSettings,
  venues,
  zadarmaSmsRespuesta,
} from "@/db/schema"
import {
  buildConcertOfferTexts,
  FLAMENCO_MEDIA_PIECES,
} from "@/lib/flamenco/catalog"
import { composeFlamencoVapiPrompt } from "@/lib/vapi/client"
import type { SeedStep } from "../types"

function buildMediaPackRows(params: {
  artistId?: string | null
  concertId?: string | null
  subjectName: string
}) {
  const slug = params.subjectName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return FLAMENCO_MEDIA_PIECES.map((piece) => ({
    artistId: params.artistId ?? null,
    concertId: params.concertId ?? null,
    pieceCode: piece.code,
    title: `${params.subjectName} · ${piece.label}`,
    formatLabel: piece.formatLabel,
    durationSeconds: piece.durationSeconds,
    maxSizeMb: piece.maxSizeMb,
    dimensions: piece.dimensions,
    recommendedUse: piece.recommendedUse,
    fileUrl: `https://cdn.soniqueteflamenco.com/media/${slug}/${piece.code}.${
      piece.code.startsWith("portadas") || piece.code.startsWith("miniatura")
        ? "jpg"
        : piece.code.startsWith("flyers")
          ? "pdf"
          : "mp4"
    }`,
    thumbnailUrl: `https://cdn.soniqueteflamenco.com/media/${slug}/thumb-${piece.code}.jpg`,
    releasePhase: piece.releasePhase,
  }))
}

export async function seedFlamencoInitialData(tx: Executor, now: Date = new Date()) {
  const existingArtists = await tx.select({ id: artists.id }).from(artists).limit(1)
  if (existingArtists.length > 0) return

  const ctx = { now }
  {
    // 1. Representantes
    const [rep1, rep2] = await tx
      .insert(representatives)
      .values([
        {
          fullName: "Manuel Montoya «Soniquete»",
          agencyName: "Soniquete con Arte · Promoción Flamenca",
          roleKind: "manager",
          commissionPercent: 15,
          phone: "+34 919 931 525",
          email: "soniqueteflamenco@soniqueteflamenco.com",
          websiteUrl: "https://soniqueteflamenco.com",
          city: "Madrid",
          notes: "Dirección general de contratación para tablaos, teatros, ateneos y ayuntamientos.",
        },
        {
          fullName: "Elena Vargas",
          agencyName: "Circuitos Escénicos y Ateneos",
          roleKind: "booking_agent",
          commissionPercent: 12,
          phone: "+34 644 812 900",
          email: "elena.vargas@soniqueteflamenco.com",
          websiteUrl: "https://soniqueteflamenco.com",
          city: "Sevilla",
          notes: "Especialista en programación de peñas flamencas, festivales y diputaciones.",
        },
      ])
      .returning()

    // 2. Intérpretes (con biografía, estilos, grupo, guitarrista titular y alternativos)
    const [art1, art2, art3] = await tx
      .insert(artists)
      .values([
        {
          artisticName: "Carmen «La Trianera»",
          legalName: "Carmen Morales Heredia",
          discipline: "cante",
          biography:
            "Cantaora de largo recorrido premiada en festivales de Andalucía y Madrid. Domina los cantes de compás y los cantes matrices con una voz jonda y cristalina. Actúa tanto en recital clásico de cante y toque como al frente de su propio cuadro flamenco con baile.",
          styles: ["Soleá", "Bulerías", "Alegrías de Cádiz", "Seguiriya", "Tientos-Tangos"],
          bringsGroup: true,
          groupFormation:
            "Cante solista (Carmen «La Trianera») + guitarra titular (Diego del Morón) + 2 palmeros/coros + bailaora invitada",
          leadGuitarist: "Diego del Morón",
          alternateGuitarists: ["Paco Heredia", "Curro de Jerez"],
          baseCacheEur: 2400,
          minCacheEur: 1600,
          city: "Madrid",
          phone: "+34 611 340 901",
          email: "carmen@soniqueteflamenco.com",
          websiteUrl: "https://soniqueteflamenco.com/artistas/carmen-la-trianera",
          instagramHandle: "@carmenlatrianera.flamenco",
          youtubeChannelUrl: "https://youtube.com/@soniqueteflamenco",
          technicalRider:
            "2 micrófonos condensador cardioide para cante y guitarra, 2 micros dinámicos para palmas, tarima de baile microfonada de 3x3 m.",
          representativeId: rep1.id,
        },
        {
          artisticName: "Diego del Morón",
          legalName: "Diego Cortés Jiménez",
          discipline: "toque",
          biography:
            "Guitarrista flamenco de concierto y acompañamiento al cante y al baile. Soniquete tradicional con armonías contemporáneas. Primer premio de guitarra de concierto y guitarrista titular habitual de las principales figuras del catálogo de Soniquete con Arte.",
          styles: ["Rondeña", "Bulería por Soleá", "Taranta", "Guajira", "Zapateado"],
          bringsGroup: false,
          groupFormation: "Recital de guitarra solista o dúo con percusión (cajón y palmas)",
          leadGuitarist: "Diego del Morón (Solista)",
          alternateGuitarists: ["Paco Heredia"],
          baseCacheEur: 1800,
          minCacheEur: 1200,
          city: "Madrid",
          phone: "+34 622 450 812",
          email: "diego@soniqueteflamenco.com",
          websiteUrl: "https://soniqueteflamenco.com/artistas/diego-del-moron",
          instagramHandle: "@diegodelmoron.toque",
          youtubeChannelUrl: "https://youtube.com/@soniqueteflamenco",
          technicalRider: "1 micro de condensador Neumann KM184 + DI activa para apoyo acústico.",
          representativeId: rep1.id,
        },
        {
          artisticName: "Cuadro Flamenco Soniquete de Madrid",
          legalName: "Producciones Soniquete con Arte S.L.",
          discipline: "cuadro",
          biography:
            "Espectáculo integral de cante, toque, percusión y pareja de baile diseñado para grandes salas de conciertos, tablaos de primer nivel, ateneos culturales y fiestas mayores de ayuntamientos.",
          styles: ["Fin de fiesta por Bulerías", "Alegrías", "Farruca", "Tangos de Granada", "Fandangos"],
          bringsGroup: true,
          groupFormation:
            "5 o 6 artistas en escena: 2 bailaores, 1 cantaora, 1 guitarrista titular (Diego del Morón) y 1 percusionista",
          leadGuitarist: "Diego del Morón",
          alternateGuitarists: ["Curro de Jerez", "Niño de Lavapiés"],
          baseCacheEur: 3600,
          minCacheEur: 2800,
          city: "Madrid",
          phone: "+34 919 931 525",
          email: "soniqueteflamenco@soniqueteflamenco.com",
          websiteUrl: "https://soniqueteflamenco.com",
          instagramHandle: "@soniqueteflamenco",
          youtubeChannelUrl: "https://youtube.com/@soniqueteflamenco",
          technicalRider: "Escenario mínimo 6x4 m, suelo de madera sonorizado, 8 canales de PA y 4 monitores.",
          representativeId: rep2.id,
          sourceWebExtracted: true,
        },
      ])
      .returning()

    // 3. Salas de Flamenco, Salas de Conciertos, Ateneos y Administración
    const [, ven2, ven3, ven4] = await tx
      .insert(venues)
      .values([
        {
          name: "Tablao Flamenco Cardamomo",
          kind: "tablao",
          city: "Madrid",
          province: "Madrid",
          address: "Calle de Echegaray, 15, Centro",
          capacity: 140,
          typicalBudgetEur: 2200,
          programmerName: "Dirección Artística Cardamomo",
          email: "programacion@cardamomo-demo.es",
          phone: "+34 918 051 038",
          websiteUrl: "https://cardamomo.com",
          instagramHandle: "@cardamomoflamenco",
          technicalEquipment: "Tablao sonorizado completo, iluminación cálida y vestuarios.",
          sourceWebExtracted: true,
        },
        {
          name: "Sala Villanos (Ciclo Flamenco Real)",
          kind: "sala_conciertos",
          city: "Madrid",
          province: "Madrid",
          address: "Calle de Bernardino Obregón, 18",
          capacity: 420,
          typicalBudgetEur: 3500,
          programmerName: "Carlos Méndez (Programación Conciertos)",
          email: "ciclos@salavillanos-demo.es",
          phone: "+34 915 308 099",
          websiteUrl: "https://salavillanos.es",
          instagramHandle: "@salavillanos",
          technicalEquipment: "PA L-Acoustics, mesa digital 32 canales, técnico de sala incluido.",
          sourceWebExtracted: true,
        },
        {
          name: "Ateneo Científico, Literario y Artístico de Madrid (Cátedra Mayor)",
          kind: "ateneo",
          city: "Madrid",
          province: "Madrid",
          address: "Calle del Prado, 21",
          capacity: 310,
          typicalBudgetEur: 2600,
          programmerName: "Sección de Música del Ateneo",
          email: "cultura@ateneodemadrid-demo.es",
          phone: "+34 914 290 400",
          websiteUrl: "https://ateneodemadrid.com",
          technicalEquipment: "Auditorio histórico de acústica natural excepcional y microfonía de apoyo.",
        },
        {
          name: "Concejalía de Cultura · Ayuntamiento de Alcalá de Henares",
          kind: "administracion",
          city: "Alcalá de Henares",
          province: "Madrid",
          address: "Plaza de Cervantes, 12",
          capacity: 550,
          typicalBudgetEur: 4200,
          programmerName: "Jefatura de Programación Cultural Municipal",
          email: "contratacion.cultura@aytoalcala-demo.es",
          phone: "+34 918 883 300",
          websiteUrl: "https://culturalcala.es",
          technicalEquipment: "Teatro Salón Cervantes con dotación escénica municipal completa.",
        },
      ])
      .returning()

    // 4. Conciertos y otros Eventos (Viajes Flamencos, Conferencias Ilustradas, Entrevistas Públicas)
    const concertDate1 = new Date(ctx.now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const concertDate2 = new Date(ctx.now.getTime() + 28 * 24 * 60 * 60 * 1000)
    const conferenceDate3 = new Date(ctx.now.getTime() + 21 * 24 * 60 * 60 * 1000)

    const [conc1, conc2, evtViaje3, evtConf4] = await tx
      .insert(concerts)
      .values([
        {
          title: "Noche de Cante y Compás · Carmen «La Trianera» & Diego del Morón",
          eventKind: "concierto",
          artistId: art1.id,
          venueId: ven3.id,
          representativeId: rep1.id,
          startsAt: concertDate1,
          dateAndPlaceTbd: false,
          provisionalBookingsOpen: false,
          autoNotifyToConfirm: true,
          cancelIfBelowMinAttendees: true,
          minAttendees: 80,
          currentAttendees: 145,
          soundcheckTime: "18:00",
          doorsTime: "19:30",
          showTime: "20:00",
          durationMinutes: 85,
          agreedCacheEur: 2600,
          ticketPriceEur: 24,
          bringsGroup: true,
          guitaristName: "Diego del Morón",
          lineupDetails: "Cante solista, guitarra titular y 2 palmeros",
          status: "confirmado",
          calcomBookingUid: "cal_soniquete_ateneo_001",
          calcomMeetingUrl: "https://app.cal.com/video/soniquete-ateneo001",
        },
        {
          title: "Gala Flamenca Soniquete · Cuadro Completo en Sala Villanos",
          eventKind: "concierto",
          artistId: art3.id,
          venueId: ven2.id,
          representativeId: rep2.id,
          startsAt: concertDate2,
          dateAndPlaceTbd: false,
          provisionalBookingsOpen: false,
          autoNotifyToConfirm: true,
          cancelIfBelowMinAttendees: true,
          minAttendees: 120,
          currentAttendees: 95,
          soundcheckTime: "18:30",
          doorsTime: "20:30",
          showTime: "21:00",
          durationMinutes: 90,
          agreedCacheEur: 3600,
          ticketPriceEur: 28,
          bringsGroup: true,
          guitaristName: "Diego del Morón",
          lineupDetails: "Cuadro de 5 integrantes con pareja de baile",
          status: "negociacion",
          calcomBookingUid: "cal_soniquete_villanos_002",
          calcomMeetingUrl: "https://app.cal.com/video/soniquete-villanos002",
        },
        {
          title: "Viaje Cultural Flamenco a Jerez y Triana con Carmen «La Trianera» y Diego del Morón",
          eventKind: "viaje_flamenco",
          artistId: art1.id,
          venueId: null,
          representativeId: rep1.id,
          startsAt: new Date(ctx.now.getTime() + 45 * 24 * 60 * 60 * 1000),
          dateAndPlaceTbd: true,
          provisionalBookingsOpen: true,
          autoNotifyToConfirm: true,
          cancelIfBelowMinAttendees: true,
          minAttendees: 25,
          currentAttendees: 16,
          soundcheckTime: "10:00",
          doorsTime: "10:30",
          showTime: "11:00",
          durationMinutes: 180,
          agreedCacheEur: 3200,
          ticketPriceEur: 195,
          bringsGroup: true,
          guitaristName: "Diego del Morón",
          lineupDetails: "Convivencia flamenca, recital privado en peña histórica y ruta guiada por peñas de Jerez y Triana",
          status: "provisional",
          notes: "Fecha exacta y punto de salida pendientes de confirmar. Reservas provisionales abiertas con aviso automático al fijar fecha.",
        },
        {
          title: "Conferencia Ilustrada y Entrevista Pública · Los Cantes de Compás por Diego del Morón",
          eventKind: "conferencia",
          artistId: art2.id,
          venueId: ven3.id,
          representativeId: rep1.id,
          startsAt: conferenceDate3,
          dateAndPlaceTbd: false,
          provisionalBookingsOpen: true,
          autoNotifyToConfirm: true,
          cancelIfBelowMinAttendees: true,
          minAttendees: 40,
          currentAttendees: 34,
          soundcheckTime: "18:00",
          doorsTime: "19:00",
          showTime: "19:30",
          durationMinutes: 75,
          agreedCacheEur: 1400,
          ticketPriceEur: 15,
          bringsGroup: false,
          guitaristName: "Diego del Morón",
          lineupDetails: "Conferencia con guitarra en directo y entrevista pública con turno de preguntas",
          status: "confirmado",
        },
      ])
      .returning()

    // 4b. Reservas provisionales para eventos con fecha/lugar por definir (con aviso automático)
    await tx.insert(eventProvisionalBookings).values([
      {
        concertId: evtViaje3.id,
        attendeeName: "Rocío Benítez (Peña Amigos del Cante)",
        attendeeEmail: "rocio.benitez@amigosdelcante-demo.es",
        attendeePhone: "+34 655 123 456",
        seats: 4,
        status: "provisional",
        notes: "Grupo de 4 socios interesados en el viaje flamenco en cuanto se cierre el fin de semana.",
      },
      {
        concertId: evtViaje3.id,
        attendeeName: "Javier Morales",
        attendeeEmail: "javier.morales@culturaflamenca-demo.es",
        attendeePhone: "+34 677 987 654",
        seats: 2,
        status: "provisional",
        notes: "Reserva provisional de 2 plazas pendiente de confirmación de fechas.",
      },
      {
        concertId: evtConf4.id,
        attendeeName: "Asociación Guitarra Clásica y Flamenca",
        attendeeEmail: "secretaria@guitarraclasica-demo.es",
        attendeePhone: "+34 611 445 566",
        seats: 6,
        status: "confirmada",
        confirmedAt: ctx.now,
      },
    ])

    // 5. Pack Multimedia de 12 piezas + Vídeos de conciertos en YouTube y piezas personalizadas abiertas
    const allMediaRows = [
      ...buildMediaPackRows({ artistId: art1.id, subjectName: art1.artisticName }),
      ...buildMediaPackRows({ artistId: art2.id, subjectName: art2.artisticName }),
      ...buildMediaPackRows({ artistId: art3.id, subjectName: art3.artisticName }),
      ...buildMediaPackRows({
        concertId: conc1.id,
        artistId: art1.id,
        subjectName: conc1.title,
      }),
      {
        artistId: art1.id,
        concertId: conc1.id,
        pieceCode: "1_completo_horizontal",
        customPieceLabel: null,
        sourcePlatform: "youtube",
        youtubeVideoId: "M7lc1UVf-VE",
        title: "Directo en YouTube · Carmen «La Trianera» & Diego del Morón en Ateneo de Madrid (Soleá y Bulerías)",
        formatLabel: "YouTube HD 16:9 (Directo)",
        durationSeconds: 540,
        maxSizeMb: null,
        dimensions: "1920x1080",
        recommendedUse: "Vídeo de concierto en directo alojado en YouTube para ver desde la ficha del artista y en el dossier.",
        fileUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        thumbnailUrl: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg",
        releasePhase: "referencia_web",
      },
      {
        artistId: art1.id,
        concertId: evtViaje3.id,
        pieceCode: "custom_otro",
        customPieceLabel: "Entrevista y Acústico en Radio Clásica + Documental de Ruta",
        sourcePlatform: "plataforma",
        youtubeVideoId: null,
        title: "Pieza Especial · Entrevista Pública y Presentación del Viaje Flamenco",
        formatLabel: "Formato Libre / Especial",
        durationSeconds: 320,
        maxSizeMb: 45,
        dimensions: "1920x1080",
        recommendedUse: "Material multimedia abierto adicional fuera de las 12 salidas estándar para prensa, radios y suscriptores.",
        fileUrl: "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/entrevista-radio-clasica.mp4",
        thumbnailUrl: "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/thumb-entrevista.jpg",
        releasePhase: "permanente",
      },
      {
        artistId: art2.id,
        concertId: evtConf4.id,
        pieceCode: "custom_otro",
        customPieceLabel: "Masterclass & Conferencia en YouTube",
        sourcePlatform: "youtube",
        youtubeVideoId: "aqz-KE-bpKQ",
        title: "Conferencia Ilustrada en YouTube · El toque de Diego del Morón",
        formatLabel: "YouTube 16:9",
        durationSeconds: 900,
        maxSizeMb: null,
        dimensions: "1920x1080",
        recommendedUse: "Conferencia íntegra en YouTube vinculada a la ficha de Diego del Morón.",
        fileUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        thumbnailUrl: "https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
        releasePhase: "referencia_web",
      },
    ]
    await tx.insert(flamencoMediaAssets).values(allMediaRows)

    // 6. Contratos
    const [cnt1, cnt2] = await tx
      .insert(contracts)
      .values([
        {
          code: "CNT-2026-001",
          concertId: conc1.id,
          artistId: art1.id,
          venueId: ven3.id,
          representativeId: rep1.id,
          contractType: "actuacion_directa",
          status: "firmado",
          totalAmountEur: 2600,
          advancePercent: 50,
          agencyCommissionPercent: 15,
          stripePaymentLinkUrl:
            "https://checkout.stripe.com/c/pay/cs_demo_soniquete_cnt_2026_001",
          stripeCheckoutSessionId: "cs_demo_soniquete_cnt_2026_001",
          clausesSummary:
            "50% (1.300 €) abonado por Stripe/Bizum a la firma; 50% restante antes del inicio del recital en el Ateneo de Madrid.",
        },
        {
          code: "CNT-2026-002",
          concertId: conc2.id,
          artistId: art3.id,
          venueId: ven2.id,
          representativeId: rep2.id,
          contractType: "coproduccion_taquilla",
          status: "enviado",
          totalAmountEur: 3600,
          advancePercent: 50,
          agencyCommissionPercent: 15,
          stripePaymentLinkUrl:
            "https://checkout.stripe.com/c/pay/cs_demo_soniquete_cnt_2026_002",
          stripeCheckoutSessionId: "cs_demo_soniquete_cnt_2026_002",
          clausesSummary:
            "Garantizado mínimo de 3.600 € + 70% de taquilla a partir de la entrada 150.",
        },
      ])
      .returning()

    // 7. Simulación de Oferta de Concierto a Sala
    const offerTexts = buildConcertOfferTexts({
      artistName: art1.artisticName,
      disciplineLabel: "Cante y Cuadro Flamenco",
      styles: art1.styles,
      bringsGroup: true,
      groupFormation: art1.groupFormation,
      guitaristName: art1.leadGuitarist,
      venueName: ven4.name,
      venueCity: ven4.city,
      proposedDateText: "Sábado 14 de Noviembre · 20:30 h",
      proposedCacheEur: 2800,
      video1FullUrl:
        "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/1_completo_horizontal.mp4",
      video2PromoUrl:
        "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/2_promo_horizontal.mp4",
      video4WhatsappUrl:
        "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/4_promo_whatsapp_horizontal.mp4",
      video7ReelUrl:
        "https://cdn.soniqueteflamenco.com/media/carmen-la-trianera/7_reel_instagram.mp4",
    })

    await tx.insert(concertOffers).values({
      title: "Propuesta Programación Otoño Flamenco · Carmen «La Trianera» con Diego del Morón",
      artistId: art1.id,
      venueId: ven4.id,
      concertId: conc1.id,
      targetVenueKind: "administracion",
      proposedDateText: "Sábado 14 de Noviembre · 20:30 h",
      proposedCacheEur: 2800,
      includesGroup: true,
      guitaristName: "Diego del Morón",
      selectedMediaPieces: [
        "1_completo_horizontal",
        "2_promo_horizontal",
        "4_promo_whatsapp_horizontal",
        "7_reel_instagram",
      ],
      channels: ["whatsapp", "telegram", "email"],
      whatsappPreview: offerTexts.whatsappPreview,
      telegramPreview: offerTexts.telegramPreview,
      emailSubject: offerTexts.emailSubject,
      emailPreview: offerTexts.emailPreview,
      status: "simulada",
    })

    // 8. Servicios Digitales para Artistas (Landing + Agentes IA + Redes + 9 Vídeos)
    await tx.insert(artistDigitalServices).values([
      {
        artistId: art1.id,
        packName: "Pack Estrella Flamenca 360º (Landing + IA + Redes + 9 Vídeos)",
        status: "activo",
        includesLanding: true,
        landingDomain: "carmenlatrianera.soniqueteflamenco.com",
        includesAiAgent: true,
        includesWhatsappChannel: true,
        includesTelegramBot: true,
        telegramBotUsername: "@soniqueteflamencoMadrid",
        includesInstagramSetup: true,
        includesYoutubeChannel: true,
        includesNineVideosPack: true,
        setupFeeEur: 950,
        monthlyFeeEur: 190,
        stripePaymentLinkUrl:
          "https://checkout.stripe.com/c/pay/cs_demo_pack_estrella_carmen",
        notes: "Incluye montaje de las 9 salidas de vídeo .mp4, portadas, miniatura y bot de contratación 24/7.",
      },
      {
        artistId: art2.id,
        packName: "Pack Presencia Escénica (Landing + Pack 9 Vídeos + WhatsApp)",
        status: "en_produccion",
        includesLanding: true,
        landingDomain: "diegodelmoron.soniqueteflamenco.com",
        includesAiAgent: true,
        includesWhatsappChannel: true,
        includesTelegramBot: false,
        includesInstagramSetup: true,
        includesYoutubeChannel: false,
        includesNineVideosPack: true,
        setupFeeEur: 550,
        monthlyFeeEur: 110,
        stripePaymentLinkUrl:
          "https://checkout.stripe.com/c/pay/cs_demo_pack_escenica_diego",
      },
    ])

    // 9. Configuración Cal.com, Stripe & Bizum y Registro de Pagos
    const existingCal = await tx.select({ id: calcomSettings.id }).from(calcomSettings).limit(1)
    if (existingCal.length === 0) {
      await tx.insert(calcomSettings).values({
        enabled: true,
        baseUrl: "https://api.cal.com/v2",
        defaultEventTypeId: "123456",
        autoSyncBookings: true,
        lastTestStatus: "ok",
        lastTestedAt: ctx.now,
      })
    }

    const existingPay = await tx.select({ id: paymentSettings.id }).from(paymentSettings).limit(1)
    if (existingPay.length === 0) {
      await tx.insert(paymentSettings).values({
        stripeEnabled: true,
        publishableKey: "pk_live_soniquete_con_arte_demo",
        enableCardAndWallets: true,
        enableBizum: true,
        currency: "EUR",
      })
    }

    await tx.insert(paymentRecords).values([
      {
        concept: "Señal 50% Contrato CNT-2026-001 · Carmen «La Trianera» en Ateneo de Madrid",
        payerName: "Ateneo de Madrid",
        payerEmail: "cultura@ateneodemadrid-demo.es",
        payerPhone: "+34 914 290 400",
        amountCents: 130_000,
        currency: "EUR",
        status: "paid",
        method: "stripe",
        stripeSessionId: "cs_demo_soniquete_cnt_2026_001",
        stripePaymentUrl: "https://checkout.stripe.com/c/pay/cs_demo_soniquete_cnt_2026_001",
        contractId: cnt1.id,
        concertId: conc1.id,
        paidAt: ctx.now,
      },
      {
        concept: "Señal 50% Contrato CNT-2026-002 · Gala Flamenca en Sala Villanos",
        payerName: "Sala Villanos Madrid",
        payerEmail: "ciclos@salavillanos-demo.es",
        payerPhone: "+34 915 308 099",
        amountCents: 180_000,
        currency: "EUR",
        status: "pending",
        method: "bizum",
        stripeSessionId: "cs_demo_soniquete_cnt_2026_002",
        stripePaymentUrl: "https://checkout.stripe.com/c/pay/cs_demo_soniquete_cnt_2026_002",
        contractId: cnt2.id,
        concertId: conc2.id,
      },
    ])

    // 10. Configuración VAPI & Zadarma + Llamadas + SMS Zadarma
    const existingVapi = await tx.select({ id: vapiSettings.id }).from(vapiSettings).limit(1)
    if (existingVapi.length === 0) {
      await tx.insert(vapiSettings).values({
        vapiEnabled: true,
        vapiAssistantId: "asst_soniquete_flamenco_madrid",
        vapiPhoneNumberId: "ph_zadarma_sip_madrid",
        zadarmaPhoneNumber: "+34919931525",
        zadarmaSipServer: "sip.zadarma.com",
        zadarmaSipLogin: "633610",
        voiceProvider: "11labs",
        voiceId: "791d5162-d5eb-40f0-8189-f19db44611d8",
        transcriberProvider: "deepgram",
        transcriberModel: "nova-2",
        transcriberLanguage: "es",
        llmModel: "gpt-4o-mini",
        temperature: "0.3",
        systemPrompt: composeFlamencoVapiPrompt({}),
        n8nSmsWebhookUrl: "https://n8n.soniqueteflamenco.com/webhook/zadarma-sms",
        zadarmaSmsCallerId: "Soniquete",
        autoSendBookingSms: true,
      })
    }

    const [call1] = await tx
      .insert(calls)
      .values([
        {
          vapiCallId: "vapi_call_soniquete_001",
          direction: "inbound",
          callerName: "Carlos Méndez (Sala Villanos)",
          phoneNumber: "+34915308099",
          status: "completed",
          durationSeconds: 142,
          summary:
            "El programador de Sala Villanos consulta disponibilidad de Carmen «La Trianera» con el guitarrista Diego del Morón para el ciclo de otoño. Se agenda videollamada en Cal.com y se envía SMS de confirmación por Zadarma.",
          transcript:
            "Lucía (Soniquete con Arte): ¡Hola! Bienvenido a Soniquete con Arte Promoción Flamenca, le atiende Lucía. ¿Con quién tengo el gusto?\nCarlos (Sala Villanos): Hola, soy Carlos de la Sala Villanos de Madrid. Queríamos consultar fechas y caché de Carmen La Trianera con su cuadro y Diego del Morón a la guitarra.\nLucía: ¡Qué alegría, Carlos! Carmen actúa con Diego del Morón como guitarrista titular y su cuadro completo. El caché base es de 2.400 € y te enviamos ahora mismo el vídeo promo horizontal de 1 minuto y el reel por WhatsApp y correo. Te dejo agendada la videollamada de cierre en Cal.com y te mando confirmación por SMS.",
          relatedArtistId: art1.id,
          relatedVenueId: ven2.id,
          relatedConcertId: conc2.id,
          startedAt: ctx.now,
          endedAt: ctx.now,
        },
        {
          vapiCallId: "vapi_call_soniquete_002",
          direction: "outbound",
          callerName: "Concejalía de Cultura Alcalá",
          phoneNumber: "+34918883300",
          status: "completed",
          durationSeconds: 108,
          summary:
            "Llamada saliente de presentación del catálogo de conciertos flamencos para la programación cultural municipal. Solicitan envío del dossier y de la pieza 1 · Completo horizontal (1:33).",
          transcript:
            "Lucía (Soniquete con Arte): Buenos días, llamo desde Soniquete con Arte para hacerles llegar nuestra propuesta de flamenco para el Teatro Salón Cervantes.\nConcejalía: Perfecto, mándanos la oferta con los vídeos y el presupuesto a contratacion.cultura@aytoalcala-demo.es.",
          relatedArtistId: art3.id,
          relatedVenueId: ven4.id,
          startedAt: ctx.now,
          endedAt: ctx.now,
        },
      ])
      .returning()

    await tx.insert(zadarmaSmsRespuesta).values([
      {
        toPhone: "34611222333",
        callerId: "Soniquete",
        message:
          "Soniquete con Arte: Confirmada tu reunion de contratacion para Sala Villanos el jueves a las 11:00h. Detalles enviados a tu correo.",
        status: "success",
        cost: "0.045 EUR",
        messagesCount: 1,
        rawResponse: JSON.stringify({
          status: "success",
          messages: 1,
          cost: 0.045,
          currency: "EUR",
        }),
        callId: call1.id,
      },
    ])
  }
}

export const flamencoStep: SeedStep = {
  name: "agencia-flamenco-vapi-calcom-stripe",
  prepare: async (ctx) => async (tx) => {
    await seedFlamencoInitialData(tx, ctx.now)
  },
}
