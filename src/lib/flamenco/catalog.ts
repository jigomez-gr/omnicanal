export type ArtistDiscipline =
  | "cante"
  | "baile"
  | "toque"
  | "percusion"
  | "cuadro"
  | "instrumentista"

export type VenueKind =
  | "sala_flamenco"
  | "tablao"
  | "sala_conciertos"
  | "administracion"
  | "ateneo"
  | "pena_flamenca"
  | "teatro"
  | "festival"
  | "centro_cultural"

export type EventKind =
  | "concierto"
  | "viaje_flamenco"
  | "conferencia"
  | "entrevista_publica"
  | "masterclass_taller"
  | "encuentro_artista"
  | "otro"

export type MediaSourcePlatform =
  | "plataforma"
  | "youtube"
  | "vimeo"
  | "instagram"
  | "otro"

export type FlamencoMediaPieceCode =
  | "1_completo_horizontal"
  | "2_promo_horizontal"
  | "3_teaser_horizontal"
  | "4_promo_whatsapp_horizontal"
  | "5_vertical_completo"
  | "6_vertical_whatsapp"
  | "7_reel_instagram"
  | "8_reel_horizontal"
  | "9_post_feed_4_5"
  | "portadas_reel_y_post"
  | "miniatura_youtube"
  | "flyers_y_carteleria"
  | "custom_otro"

export interface FlamencoMediaPieceDefinition {
  code: FlamencoMediaPieceCode
  label: string
  formatLabel: string
  durationSeconds: number | null
  maxSizeMb: number | null
  dimensions: string
  recommendedUse: string
  releasePhase: "tres_semanas_antes" | "semana_antes" | "referencia_web"
}

/**
 * Catálogo oficial de las 12 salidas multimedia para cada intérprete y cada concierto:
 * "2. Para qué sirve cada salida"
 */
export const FLAMENCO_MEDIA_PIECES: readonly FlamencoMediaPieceDefinition[] = [
  {
    code: "1_completo_horizontal",
    label: "1 · Completo horizontal (1:33)",
    formatLabel: "16:9 · MP4 (1:33)",
    durationSeconds: 93,
    maxSizeMb: null,
    dimensions: "1920×1080",
    recommendedUse:
      "YouTube, la web de soniqueteflamenco.com, proyectarlo en el Club Social, Ateneo o en la sala antes del espectáculo. Es la pieza “de referencia”, con todo el mensaje.",
    releasePhase: "referencia_web",
  },
  {
    code: "2_promo_horizontal",
    label: "2 · Promo horizontal (1:02)",
    formatLabel: "16:9 · MP4 (1:02)",
    durationSeconds: 62,
    maxSizeMb: null,
    dimensions: "1920×1080",
    recommendedUse:
      "Facebook, anuncio en la web o email, enviar a quien pide más información. Cuenta lo esencial sin cansar.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "3_teaser_horizontal",
    label: "3 · Teaser horizontal (29 s)",
    formatLabel: "16:9 · MP4 (29 s)",
    durationSeconds: 29,
    maxSizeMb: null,
    dimensions: "1920×1080",
    recommendedUse:
      "Recordatorio los últimos días antes del concierto y anuncios cortos: título, fecha, lugar y contacto.",
    releasePhase: "semana_antes",
  },
  {
    code: "4_promo_whatsapp_horizontal",
    label: "4 · Promo WhatsApp horizontal (6 MB)",
    formatLabel: "16:9 · MP4 ligero (6 MB)",
    durationSeconds: 62,
    maxSizeMb: 6,
    dimensions: "1280×720",
    recommendedUse:
      "Grupos y chats de WhatsApp desde el móvil (pesa muy poco). Para ordenador o televisión.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "5_vertical_completo",
    label: "5 · Vertical completo (1:33)",
    formatLabel: "9:16 · MP4 (1:33)",
    durationSeconds: 93,
    maxSizeMb: null,
    dimensions: "1080×1920",
    recommendedUse:
      "Historias largas, TikTok, Reels sin recortar y pantallas verticales del centro o teatro. Es la versión íntegra para móvil.",
    releasePhase: "referencia_web",
  },
  {
    code: "6_vertical_whatsapp",
    label: "6 · Vertical WhatsApp (12 MB)",
    formatLabel: "9:16 · MP4 móvil (12 MB)",
    durationSeconds: 62,
    maxSizeMb: 12,
    dimensions: "720×1280",
    recommendedUse:
      "Estados y envíos a contactos por WhatsApp en formato móvil, bajo el límite de 16 MB. Es la mejor para difundir entre conocidos y programadores.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "7_reel_instagram",
    label: "7 · Reel Instagram (58 s)",
    formatLabel: "9:16 · MP4 (58 s)",
    durationSeconds: 58,
    maxSizeMb: null,
    dimensions: "1080×1920",
    recommendedUse:
      "Publicar como Reel en Instagram y Facebook, y como Short en YouTube. Es la que mejor funciona para llegar a gente nueva.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "8_reel_horizontal",
    label: "8 · Reel horizontal (58 s)",
    formatLabel: "16:9 · MP4 (58 s)",
    durationSeconds: 58,
    maxSizeMb: null,
    dimensions: "1920×1080",
    recommendedUse:
      "Misma síntesis del reel, pero apaisada: YouTube normal y Facebook en ordenador.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "9_post_feed_4_5",
    label: "9 · Post feed 4:5 (58 s)",
    formatLabel: "4:5 · MP4 (58 s)",
    durationSeconds: 58,
    maxSizeMb: null,
    dimensions: "1080×1350",
    recommendedUse:
      "Publicación en el feed de Instagram y Facebook, que ocupa más pantalla que un cuadrado.",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "portadas_reel_y_post",
    label: "Portadas (Reel 1080×1920 y Post 1080×1350)",
    formatLabel: "JPG / PNG Alta Resolución",
    durationSeconds: null,
    maxSizeMb: 2,
    dimensions: "1080×1920 / 1080×1350",
    recommendedUse: "Imagen de portada del Reel (1080×1920) y del post (1080×1350).",
    releasePhase: "tres_semanas_antes",
  },
  {
    code: "miniatura_youtube",
    label: "Miniatura (1920×1080)",
    formatLabel: "JPG / PNG 16:9",
    durationSeconds: null,
    maxSizeMb: 2,
    dimensions: "1920×1080",
    recommendedUse: "Miniatura para YouTube o enlaces (1920×1080).",
    releasePhase: "referencia_web",
  },
  {
    code: "flyers_y_carteleria",
    label: "Flyers, Carteles y Dosier PDF",
    formatLabel: "PDF / JPG Impresión y Digital",
    durationSeconds: null,
    maxSizeMb: 8,
    dimensions: "A3 / 1080×1350",
    recommendedUse:
      "Cartelería para sala, envío a programadores de ateneos y ayuntamientos y prensa.",
    releasePhase: "tres_semanas_antes",
  },
]

export const MEDIA_COMBINATION_GUIDE =
  "Cómo combinarlas: tres semanas antes, difunde el reel (7) y la versión de WhatsApp (6); la semana de antes, el teaser (3); y deja el completo (1) en la web como referencia."

export const ARTIST_DISCIPLINE_LABELS: Record<ArtistDiscipline, string> = {
  cante: "Cante Flamenco",
  baile: "Baile Flamenco",
  toque: "Toque (Guitarra)",
  percusion: "Percusión y Compás",
  cuadro: "Cuadro Flamenco Completo",
  instrumentista: "Instrumentista Flamenco (Flauta, Violín, Piano)",
}

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  sala_flamenco: "Sala de Flamenco",
  tablao: "Tablao Flamenco",
  sala_conciertos: "Sala de Conciertos",
  administracion: "Administración Pública (Ayuntamiento / Diputación / CC.AA.)",
  ateneo: "Ateneo Cultural",
  pena_flamenca: "Peña Flamenca",
  teatro: "Teatro / Auditorio",
  festival: "Festival de Flamenco",
  centro_cultural: "Centro Cultural / Club Social",
}

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  concierto: "Concierto / Recital Flamenco",
  viaje_flamenco: "Viaje Cultural / Ruta Flamenca",
  conferencia: "Conferencia / Ponencia Ilustrada",
  entrevista_publica: "Entrevista Pública / Encuentro con Prensa y Público",
  masterclass_taller: "Masterclass / Taller de Cante, Toque o Baile",
  encuentro_artista: "Encuentro Íntimo con el Artista / Coloquio",
  otro: "Otro Evento Especial",
}

export const MEDIA_SOURCE_PLATFORM_LABELS: Record<MediaSourcePlatform, string> = {
  plataforma: "Nuestra Plataforma (Archivo directo .MP4 / PDF / Imagen)",
  youtube: "YouTube (Vídeo / Short / Directo embebido)",
  vimeo: "Vimeo",
  instagram: "Instagram / Reel externo",
  otro: "Otra plataforma externa",
}

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  const match =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,15})/) ??
    null
  return match?.[1] ?? null
}

export const CONCERT_STATUS_LABELS: Record<string, string> = {
  propuesta: "En Propuesta",
  negociacion: "En Negociación",
  confirmado: "Confirmado",
  celebrado: "Celebrado",
  cancelado: "Cancelado",
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  actuacion_directa: "Contrato de Actuación Directa (Caché Fijo)",
  coproduccion_taquilla: "Coproducción / Porcentaje de Taquilla",
  licitacion_publica: "Contratación / Licitación Administración Pública",
  exclusividad_gira: "Exclusividad de Gira / Temporada",
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado a Sala",
  firmado: "Firmado",
  facturado: "Facturado",
  pagado: "Pagado (Stripe / Transferencia)",
  cancelado: "Cancelado",
}

export const ARTIST_DIGITAL_PACK_PRESETS = [
  {
    packName: "Pack Estrella Flamenca 360º (Landing + IA + Redes + 9 Vídeos)",
    setupFeeEur: 950,
    monthlyFeeEur: 190,
    includesLanding: true,
    includesAiAgent: true,
    includesWhatsappChannel: true,
    includesTelegramBot: true,
    includesInstagramSetup: true,
    includesYoutubeChannel: true,
    includesNineVideosPack: true,
    description:
      "Landing page artística propia, Agente IA de contratación 24/7 en WhatsApp, Instagram y Telegram (@soniqueteflamencoMadrid), canal de YouTube optimizado y edición de las 9 piezas de vídeo .mp4 + portadas + miniatura.",
  },
  {
    packName: "Pack Presencia Escénica (Landing + Pack 9 Vídeos + WhatsApp)",
    setupFeeEur: 550,
    monthlyFeeEur: 110,
    includesLanding: true,
    includesAiAgent: true,
    includesWhatsappChannel: true,
    includesTelegramBot: false,
    includesInstagramSetup: true,
    includesYoutubeChannel: false,
    includesNineVideosPack: true,
    description:
      "Web de presentación del intérprete con las 9 salidas de vídeo .mp4, dossier descargable y recepción automática de solicitudes de salas por WhatsApp e Instagram.",
  },
  {
    packName: "Pack Producción Audiovisual (9 Salidas .MP4 + Portadas + Miniatura + Flyers)",
    setupFeeEur: 380,
    monthlyFeeEur: 0,
    includesLanding: false,
    includesAiAgent: false,
    includesWhatsappChannel: false,
    includesTelegramBot: false,
    includesInstagramSetup: false,
    includesYoutubeChannel: true,
    includesNineVideosPack: true,
    description:
      "Grabación y montaje de las 9 piezas oficiales (.mp4 horizontal, vertical, WhatsApp 6 MB y 12 MB, Reel 58 s, feed 4:5, teaser 29 s), portadas, miniatura de YouTube y flyers.",
  },
] as const

export function buildConcertOfferTexts(params: {
  artistName: string
  disciplineLabel: string
  styles: string[]
  bringsGroup: boolean
  groupFormation: string
  guitaristName?: string | null
  venueName: string
  venueCity: string
  proposedDateText: string
  proposedCacheEur: number
  video1FullUrl: string
  video2PromoUrl: string
  video4WhatsappUrl: string
  video7ReelUrl: string
}) {
  const stylesStr = params.styles.length > 0 ? params.styles.join(", ") : "Cante, Toque y Baile"
  const groupLine = params.bringsGroup
    ? `Formación completa: ${params.groupFormation}${params.guitaristName ? ` (con el toque titular de ${params.guitaristName})` : ""}`
    : `Formato solista${params.guitaristName ? ` acompañado a la guitarra por ${params.guitaristName}` : ""}`

  const whatsappPreview = [
    `✨ *PROPUESTA ARTÍSTICA · SONIQUETEFLAMENCO.COM* ✨`,
    `Hola equipo de programación de *${params.venueName}* (${params.venueCity}):`,
    ``,
    `Os presentamos la propuesta de concierto de *${params.artistName}* (${params.disciplineLabel}) para vuestra programación:`,
    `🎶 *Estilos / Palos:* ${stylesStr}`,
    `🎸 *Elenco:* ${groupLine}`,
    `📅 *Fechas propuestas:* ${params.proposedDateText}`,
    `💶 *Caché orientativo:* ${params.proposedCacheEur.toLocaleString("es-ES")} € + IVA`,
    ``,
    `🎬 *Pack Multimedia del Espectáculo:*`,
    `• Promo WhatsApp (6 MB): ${params.video4WhatsappUrl}`,
    `• Reel resumen (58 s): ${params.video7ReelUrl}`,
    `• Pieza completa de referencia (1:33): ${params.video1FullUrl}`,
    ``,
    `¿Agendamos una breve videollamada o llamada para cuadrar fecha?`,
    `📩 soniqueteflamenco@soniqueteflamenco.com | 🌐 https://soniqueteflamenco.com`,
  ].join("\n")

  const telegramPreview = [
    `🔥 <b>SONIQUETEFLAMENCO.COM · OFERTA DE CONCIERTO</b>`,
    `🏛 Destinatario: <b>${params.venueName}</b> (${params.venueCity})`,
    `🎤 Intérprete: <b>${params.artistName}</b> (${params.disciplineLabel})`,
    `🎸 Formación: ${groupLine}`,
    `🎼 Palos: ${stylesStr}`,
    `📅 Fecha propuesta: ${params.proposedDateText} · Caché: ${params.proposedCacheEur.toLocaleString("es-ES")} €`,
    `🎥 Promo horizontal (1:02): ${params.video2PromoUrl}`,
    `🤖 Canal oficial Telegram: @soniqueteflamencoMadrid`,
  ].join("\n")

  const emailSubject = `Propuesta de Programación Flamenca: ${params.artistName} en ${params.venueName} (${params.proposedDateText})`

  const emailPreview = [
    `Estimado equipo de programación de ${params.venueName} (${params.venueCity}),`,
    ``,
    `Desde la agencia soniqueteflamenco.com · Promoción Flamenca (https://soniqueteflamenco.com) les hacemos llegar el dossier y pack audiovisual del espectáculo de ${params.artistName} (${params.disciplineLabel}).`,
    ``,
    `FICHA ARTÍSTICA Y TÉCNICA:`,
    `- Repertorio y estilos: ${stylesStr}`,
    `- Formación en escena: ${groupLine}`,
    `- Fechas disponibles propuestas: ${params.proposedDateText}`,
    `- Condiciones económicas (caché): ${params.proposedCacheEur.toLocaleString("es-ES")} €`,
    ``,
    `MATERIAL AUDIOVISUAL (.MP4 Y CARTELERÍA):`,
    `- 1 · Completo horizontal (1:33 · Referencia): ${params.video1FullUrl}`,
    `- 2 · Promo horizontal (1:02 · Presentación): ${params.video2PromoUrl}`,
    `- 4 · Promo WhatsApp horizontal (6 MB): ${params.video4WhatsappUrl}`,
    `- 7 · Reel Instagram / Short (58 s): ${params.video7ReelUrl}`,
    ``,
    `Quedamos a su entera disposición para agendar una reunión online mediante Cal.com o atenderles en nuestra línea directa.`,
    ``,
    `Un cordial saludo,`,
    `Dirección de Contratación · soniqueteflamenco.com`,
    `soniqueteflamenco@soniqueteflamenco.com · https://soniqueteflamenco.com`,
    `Telegram: @soniqueteflamencoMadrid`,
  ].join("\n")

  return {
    whatsappPreview,
    telegramPreview,
    emailSubject,
    emailPreview,
  }
}
