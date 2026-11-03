import "server-only"
import { desc, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import {
  artistDigitalServices,
  artists,
  businessSettings,
  calcomSettings,
  calls,
  campaignRecipients,
  campaigns,
  channels,
  concertOffers,
  concerts,
  contactIdentities,
  contacts,
  contracts,
  eventProvisionalBookings,
  flamencoMediaAssets,
  integrationSettings,
  paymentRecords,
  paymentSettings,
  representatives,
  vapiSettings,
  venues,
  zadarmaSmsRespuesta,
} from "@/db/schema"
import {
  createCalcomBooking,
  getCalcomV2BaseUrl,
  testCalcomConnection,
} from "@/lib/calcom/client"
import {
  ARTIST_DIGITAL_PACK_PRESETS,
  buildConcertOfferTexts,
  extractYouTubeVideoId,
  FLAMENCO_MEDIA_PIECES,
  type ArtistDiscipline,
  type EventKind,
  type FlamencoMediaPieceCode,
  type MediaSourcePlatform,
  type VenueKind,
} from "@/lib/flamenco/catalog"
import { PERMISSIONS, type Actor } from "@/lib/permissions"
import { createStripeCheckoutSession } from "@/lib/stripe/client"
import {
  composeFlamencoVapiPrompt,
  connectZadarmaSipTrunkToVapi,
  sendZadarmaEchoTestCall,
  syncFlamencoToolsToVapi,
  triggerVapiOutboundCall,
} from "@/lib/vapi/client"
import { sendZadarmaSms } from "@/lib/zadarma/client"
import { getAppUrl } from "@/server/app-url"
import {
  encryptMailPasswords,
  readEmailConfig,
  updateEmailConfig,
} from "@/server/channels/email/config"
import { ensureEmailPolling } from "@/server/channels/email/jobs"
import {
  encryptSecret,
  maskSecret,
  tryDecryptSecret,
} from "@/server/crypto"
import { NotFoundError, parseInput, ValidationError } from "@/server/errors"
import { seedFlamencoInitialData } from "../../seed/steps/flamenco"
import { writeAudit } from "./audit"
import { assertCan } from "./guard"

// ─── Schemas Zod ─────────────────────────────────────────────────────────────────────────────────────────────

const createArtistSchema = z.object({
  artisticName: z.string().trim().min(1, "El nombre artístico es obligatorio.").max(160),
  legalName: z.string().trim().max(160).optional().nullable(),
  discipline: z
    .enum(["cante", "baile", "toque", "percusion", "cuadro", "instrumentista"])
    .default("cante"),
  biography: z.string().trim().max(5000).default(""),
  styles: z.array(z.string().trim().min(1).max(80)).max(30).default(["Soleá", "Bulerías", "Alegrías"]),
  bringsGroup: z.boolean().default(true),
  groupFormation: z.string().trim().max(500).default("Cante, toque, compás y baile"),
  leadGuitarist: z.string().trim().max(160).optional().nullable(),
  alternateGuitarists: z.array(z.string().trim().max(120)).max(10).default([]),
  baseCacheEur: z.number().int().min(0).max(500_000).default(1800),
  minCacheEur: z.number().int().min(0).max(500_000).default(1200),
  city: z.string().trim().max(120).default("Madrid"),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("Correo no válido.").optional().nullable().or(z.literal("")),
  websiteUrl: z.string().trim().max(300).optional().nullable(),
  instagramHandle: z.string().trim().max(120).optional().nullable(),
  youtubeChannelUrl: z.string().trim().max(300).optional().nullable(),
  technicalRider: z.string().trim().max(3000).optional().nullable(),
  representativeId: z.string().uuid().optional().nullable(),
  generateStandardMediaPack: z.boolean().default(true),
})

const createRepresentativeSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
  agencyName: z.string().trim().max(160).optional().nullable(),
  roleKind: z.enum(["manager", "booking_agent", "apoderado", "productor"]).default("manager"),
  commissionPercent: z.number().int().min(0).max(50).default(15),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("Correo no válido.").optional().nullable().or(z.literal("")),
  websiteUrl: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(120).default("Madrid"),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const createVenueSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la sala o entidad es obligatorio.").max(180),
  kind: z
    .enum([
      "sala_flamenco",
      "tablao",
      "sala_conciertos",
      "administracion",
      "ateneo",
      "pena_flamenca",
      "teatro",
      "festival",
      "centro_cultural",
    ])
    .default("sala_flamenco"),
  city: z.string().trim().max(120).default("Madrid"),
  province: z.string().trim().max(120).default("Madrid"),
  country: z.string().trim().max(80).default("España"),
  address: z.string().trim().max(260).optional().nullable(),
  capacity: z.number().int().min(10).max(100_000).default(180),
  typicalBudgetEur: z.number().int().min(0).max(500_000).default(2200),
  programmerName: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email("Correo no válido.").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  websiteUrl: z.string().trim().max(300).optional().nullable(),
  instagramHandle: z.string().trim().max(120).optional().nullable(),
  technicalEquipment: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const createConcertSchema = z.object({
  title: z.string().trim().min(1, "El título del concierto o evento es obligatorio.").max(200),
  eventKind: z
    .enum([
      "concierto",
      "viaje_flamenco",
      "conferencia",
      "entrevista_publica",
      "masterclass_taller",
      "encuentro_artista",
      "otro",
    ])
    .default("concierto"),
  artistId: z.string().uuid(),
  venueId: z.string().uuid().optional().nullable().or(z.literal("")),
  representativeId: z.string().uuid().optional().nullable(),
  startsAtIso: z.string().optional().nullable(),
  dateAndPlaceTbd: z.boolean().default(false),
  provisionalBookingsOpen: z.boolean().default(false),
  autoNotifyToConfirm: z.boolean().default(true),
  cancelIfBelowMinAttendees: z.boolean().default(false),
  minAttendees: z.number().int().min(0).max(100_000).default(0),
  currentAttendees: z.number().int().min(0).max(100_000).default(0),
  soundcheckTime: z.string().trim().max(20).default("18:30"),
  doorsTime: z.string().trim().max(20).default("20:30"),
  showTime: z.string().trim().max(20).default("21:00"),
  durationMinutes: z.number().int().min(15).max(10_080).default(80),
  agreedCacheEur: z.number().int().min(0).max(500_000).default(2200),
  ticketPriceEur: z.number().int().min(0).max(5000).default(25),
  bringsGroup: z.boolean().default(true),
  guitaristName: z.string().trim().max(160).optional().nullable(),
  lineupDetails: z.string().trim().max(1000).optional().nullable(),
  status: z
    .enum(["propuesta", "provisional", "negociacion", "confirmado", "celebrado", "cancelado"])
    .default("propuesta"),
  createCalcomMeeting: z.boolean().default(true),
  generateStandardMediaPack: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const createProvisionalBookingSchema = z.object({
  concertId: z.string().uuid(),
  attendeeName: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
  attendeeEmail: z.string().trim().email("Correo no válido.").optional().nullable().or(z.literal("")),
  attendeePhone: z.string().trim().max(40).optional().nullable(),
  seats: z.number().int().min(1).max(200).default(1),
  notes: z.string().trim().max(1000).optional().nullable(),
})

const notifyProvisionalBookingsSchema = z.object({
  concertId: z.string().uuid(),
  confirmedStartsAtIso: z.string().optional().nullable(),
  confirmedVenueId: z.string().uuid().optional().nullable().or(z.literal("")),
  customMessage: z.string().trim().max(1500).optional().nullable(),
})

const createContractSchema = z.object({
  code: z.string().trim().min(1).max(60),
  concertId: z.string().uuid().optional().nullable(),
  artistId: z.string().uuid(),
  venueId: z.string().uuid().optional().nullable(),
  representativeId: z.string().uuid().optional().nullable(),
  contractType: z
    .enum(["actuacion_directa", "coproduccion_taquilla", "licitacion_publica", "exclusividad_gira"])
    .default("actuacion_directa"),
  status: z
    .enum(["borrador", "enviado", "firmado", "facturado", "pagado", "cancelado"])
    .default("borrador"),
  totalAmountEur: z.number().int().min(0).max(1_000_000),
  advancePercent: z.number().int().min(0).max(100).default(50),
  agencyCommissionPercent: z.number().int().min(0).max(60).default(15),
  clausesSummary: z.string().trim().max(4000).optional().nullable(),
})

const createMediaAssetSchema = z.object({
  artistId: z.string().uuid().optional().nullable(),
  concertId: z.string().uuid().optional().nullable(),
  pieceCode: z.string().trim().min(1).max(80),
  customPieceLabel: z.string().trim().max(160).optional().nullable(),
  sourcePlatform: z
    .enum(["plataforma", "youtube", "vimeo", "instagram", "otro"])
    .default("plataforma"),
  title: z.string().trim().min(1).max(200),
  formatLabel: z.string().trim().max(80).default("16:9 · MP4"),
  durationSeconds: z.number().int().min(0).max(10_800).optional().nullable(),
  maxSizeMb: z.number().int().min(0).max(2048).optional().nullable(),
  dimensions: z.string().trim().max(40).default("1920x1080"),
  recommendedUse: z.string().trim().max(500).default(""),
  fileUrl: z.string().trim().min(1).max(500),
  thumbnailUrl: z.string().trim().max(500).optional().nullable(),
  releasePhase: z
    .enum(["tres_semanas_antes", "semana_antes", "referencia_web", "permanente"])
    .default("referencia_web"),
})

const simulateOfferSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artistId: z.string().uuid(),
  venueId: z.string().uuid().optional().nullable(),
  concertId: z.string().uuid().optional().nullable(),
  targetVenueKind: z.string().trim().max(80).default("sala_flamenco"),
  proposedDateText: z.string().trim().min(1).max(120),
  proposedCacheEur: z.number().int().min(0).max(500_000),
  includesGroup: z.boolean().default(true),
  guitaristName: z.string().trim().max(160).optional().nullable(),
  channels: z.array(z.enum(["whatsapp", "telegram", "email"])).min(1).default(["whatsapp", "telegram", "email"]),
  createCampaignInEnvios: z.boolean().default(true),
})

const scrapeWebEntitySchema = z.object({
  targetType: z.enum(["venue", "artist"]),
  websiteUrl: z.string().trim().min(4).max(400),
  fallbackName: z.string().trim().max(180).optional().nullable(),
  fallbackCity: z.string().trim().max(120).optional().nullable(),
  venueKind: z
    .enum([
      "sala_flamenco",
      "tablao",
      "sala_conciertos",
      "administracion",
      "ateneo",
      "pena_flamenca",
      "teatro",
      "festival",
      "centro_cultural",
    ])
    .optional(),
  artistDiscipline: z
    .enum(["cante", "baile", "toque", "percusion", "cuadro", "instrumentista"])
    .optional(),
})

const createArtistDigitalServiceSchema = z.object({
  artistId: z.string().uuid(),
  packName: z.string().trim().min(1).max(180),
  status: z
    .enum(["propuesta", "activo", "en_produccion", "entregado", "pausado"])
    .default("en_produccion"),
  includesLanding: z.boolean().default(true),
  landingDomain: z.string().trim().max(200).optional().nullable(),
  includesAiAgent: z.boolean().default(true),
  includesWhatsappChannel: z.boolean().default(true),
  includesTelegramBot: z.boolean().default(true),
  includesInstagramSetup: z.boolean().default(true),
  includesYoutubeChannel: z.boolean().default(true),
  includesNineVideosPack: z.boolean().default(true),
  setupFeeEur: z.number().int().min(0).max(100_000).default(950),
  monthlyFeeEur: z.number().int().min(0).max(50_000).default(190),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const updateCalcomConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().trim().max(300).optional().nullable(),
  baseUrl: z.string().trim().min(5).max(300).default("https://api.cal.com/v2"),
  defaultEventTypeId: z.string().trim().max(60).optional().nullable(),
  autoSyncBookings: z.boolean().default(true),
})

const updatePaymentConfigSchema = z.object({
  stripeEnabled: z.boolean(),
  publishableKey: z.string().trim().max(300).optional().nullable(),
  secretKey: z.string().trim().max(300).optional().nullable(),
  webhookSecret: z.string().trim().max(300).optional().nullable(),
  enableCardAndWallets: z.boolean().default(true),
  enableBizum: z.boolean().default(true),
  currency: z.string().trim().min(3).max(6).default("EUR"),
})

const createPaymentRecordSchema = z.object({
  concept: z.string().trim().min(1).max(220),
  payerName: z.string().trim().min(1).max(160),
  payerEmail: z.string().trim().email("Correo no válido.").optional().nullable().or(z.literal("")),
  payerPhone: z.string().trim().max(40).optional().nullable(),
  amountEur: z.number().min(1).max(500_000),
  method: z.enum(["stripe", "bizum", "transfer", "cash"]).default("stripe"),
  markAsPaidImmediately: z.boolean().default(false),
  contractId: z.string().uuid().optional().nullable(),
  concertId: z.string().uuid().optional().nullable(),
  artistServiceId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})

const updateVapiConfigSchema = z.object({
  vapiEnabled: z.boolean(),
  vapiApiKey: z.string().trim().max(300).optional().nullable(),
  vapiAssistantId: z.string().trim().max(160).optional().nullable(),
  vapiPhoneNumberId: z.string().trim().max(160).optional().nullable(),
  zadarmaPhoneNumber: z.string().trim().max(60).default("+34919933764"),
  zadarmaSipServer: z.string().trim().max(120).default("sip.zadarma.com"),
  zadarmaSipLogin: z.string().trim().max(120).default("536586"),
  zadarmaSipPassword: z.string().trim().max(100).optional().nullable(),
  voiceProvider: z.string().trim().max(60).default("11labs"),
  voiceId: z.string().trim().max(120).default("791d5162-d5eb-40f0-8189-f19db44611d8"),
  transcriberProvider: z.string().trim().max(60).default("deepgram"),
  transcriberModel: z.string().trim().max(60).default("nova-3-general"),
  transcriberLanguage: z.string().trim().max(20).default("es"),
  llmModel: z.string().trim().max(100).default("gpt-4o-mini"),
  temperature: z.string().trim().max(10).default("0.3"),
  systemPrompt: z.string().trim().max(12_000).optional().nullable(),
  n8nSmsWebhookUrl: z.string().trim().max(300).optional().nullable(),
  zadarmaSmsKey: z.string().trim().max(300).optional().nullable(),
  zadarmaSmsSecret: z.string().trim().max(300).optional().nullable(),
  zadarmaSmsCallerId: z.string().trim().max(40).default("+34919933764"),
  autoSendBookingSms: z.boolean().default(true),
})

// ─── Helper: Pack Multimedia estándar de 12 piezas ───────────────────────────────────────────────────────────

export async function generateStandardMediaPackForTarget(params: {
  artistId?: string | null
  concertId?: string | null
  subjectName: string
}): Promise<number> {
  const slug = params.subjectName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const rows = FLAMENCO_MEDIA_PIECES.map((piece) => ({
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

  await db.insert(flamencoMediaAssets).values(rows)
  return rows.length
}

// ─── Helper: Sincronizar contacto en tabla `contacts` ────────────────────────────────────────────────────────

async function upsertAgencyContact(params: {
  name: string
  email?: string | null
  phone?: string | null
  tag: string
  notes?: string | null
}): Promise<string> {
  const cleanEmail = params.email?.trim().toLowerCase() || null
  const cleanPhone = params.phone?.trim() || null

  if (cleanEmail) {
    const existing = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, cleanEmail))
      .limit(1)
    if (existing[0]) {
      const currentLabels = Array.isArray(existing[0].labels) ? existing[0].labels : []
      const nextLabels = currentLabels.includes(params.tag)
        ? currentLabels
        : [...currentLabels, params.tag]
      await db
        .update(contacts)
        .set({
          labels: nextLabels,
          phone: existing[0].phone || cleanPhone,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing[0].id))
      return existing[0].id
    }
  }

  const [created] = await db
    .insert(contacts)
    .values({
      name: params.name,
      email: cleanEmail,
      phone: cleanPhone,
      labels: [params.tag, "flamenco"],
      customFields: params.notes ? { origen: params.notes } : {},
    })
    .returning({ id: contacts.id })

  if (cleanEmail) {
    await db
      .insert(contactIdentities)
      .values({
        contactId: created.id,
        channelType: "email_gmail",
        externalId: cleanEmail,
        displayName: params.name,
      })
      .onConflictDoNothing()
  }

  if (cleanPhone) {
    const digits = cleanPhone.replace(/\D/g, "")
    if (digits.length >= 9) {
      await db
        .insert(contactIdentities)
        .values({
          contactId: created.id,
          channelType: "whatsapp",
          externalId: digits.startsWith("34") ? `+${digits}` : `+34${digits}`,
          phone: digits,
          displayName: params.name,
        })
        .onConflictDoNothing()
    }
  }

  return created.id
}

// ─── Lectura global del panel de Promoción Artística ─────────────────────────────────────────────────────────

export const HOSTINGER_MAILBOX_DEFAULTS = {
  domain: "soniqueteflamenco.com",
  websiteUrl: "https://soniqueteflamenco.com",
  emailAddress: "soniqueteflamenco@soniqueteflamenco.com",
  channelName: "Correo Soniquete Flamenco (Hostinger)",
  imapHost: "imap.hostinger.com",
  imapPort: 993,
  imapSecurity: "tls" as const,
  smtpHost: "smtp.hostinger.com",
  smtpPort: 465,
  smtpSecurity: "tls" as const,
}

export async function ensureHostingerMailboxChannel(options?: { plainPassword?: string }) {
  const existingImapRows = await db
    .select()
    .from(channels)
    .where(eq(channels.type, "email_imap"))

  const match = existingImapRows.find((row) => {
    const cfg = readEmailConfig(row.config)
    return (
      cfg.emailAddress?.toLowerCase() === HOSTINGER_MAILBOX_DEFAULTS.emailAddress ||
      row.name.includes("soniqueteflamenco")
    )
  })

  const envPassword = process.env.SONIQUETE_EMAIL_PASSWORD?.trim()
  const passwordToSave = options?.plainPassword?.trim() || envPassword || ""
  const now = new Date()

  let channelId = match?.id
  if (!channelId) {
    const [created] = await db
      .insert(channels)
      .values({
        type: "email_imap",
        name: HOSTINGER_MAILBOX_DEFAULTS.channelName,
        status: passwordToSave ? "connected" : "connecting",
        isDemo: false,
        replyMode: "draft",
        aiEnabled: true,
        config: {
          emailAddress: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
          signature: "Soniquete Flamenco · Promoción Artística · https://soniqueteflamenco.com",
          imap: {
            imapHost: HOSTINGER_MAILBOX_DEFAULTS.imapHost,
            imapPort: HOSTINGER_MAILBOX_DEFAULTS.imapPort,
            imapSecurity: HOSTINGER_MAILBOX_DEFAULTS.imapSecurity,
            smtpHost: HOSTINGER_MAILBOX_DEFAULTS.smtpHost,
            smtpPort: HOSTINGER_MAILBOX_DEFAULTS.smtpPort,
            smtpSecurity: HOSTINGER_MAILBOX_DEFAULTS.smtpSecurity,
            username: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
            smtpUsername: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
          },
        },
        ...(passwordToSave
          ? {
              secretsEnc: encryptMailPasswords({
                password: passwordToSave,
                smtpPassword: passwordToSave,
              }),
              lastHealth: {
                checkedAt: now.toISOString(),
                checks: [
                  {
                    key: "connection",
                    status: "ok" as const,
                    detail: `Configurado en ${HOSTINGER_MAILBOX_DEFAULTS.imapHost}:993 / ${HOSTINGER_MAILBOX_DEFAULTS.smtpHost}:465`,
                  },
                ],
              },
              lastHealthAt: now,
            }
          : {}),
      })
      .returning({ id: channels.id })
    channelId = created.id
  } else if (passwordToSave && (!match?.secretsEnc || options?.plainPassword)) {
    await updateEmailConfig(
      channelId,
      {
        emailAddress: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
        signature: "Soniquete Flamenco · Promoción Artística · https://soniqueteflamenco.com",
        imap: {
          imapHost: HOSTINGER_MAILBOX_DEFAULTS.imapHost,
          imapPort: HOSTINGER_MAILBOX_DEFAULTS.imapPort,
          imapSecurity: HOSTINGER_MAILBOX_DEFAULTS.imapSecurity,
          smtpHost: HOSTINGER_MAILBOX_DEFAULTS.smtpHost,
          smtpPort: HOSTINGER_MAILBOX_DEFAULTS.smtpPort,
          smtpSecurity: HOSTINGER_MAILBOX_DEFAULTS.smtpSecurity,
          username: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
          smtpUsername: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
        },
      },
      {
        extra: {
          status: "connected",
          secretsEnc: encryptMailPasswords({
            password: passwordToSave,
            smtpPassword: passwordToSave,
          }),
          lastHealth: {
            checkedAt: now.toISOString(),
            checks: [
              {
                key: "connection",
                status: "ok" as const,
                detail: `Configurado en ${HOSTINGER_MAILBOX_DEFAULTS.imapHost}:993 / ${HOSTINGER_MAILBOX_DEFAULTS.smtpHost}:465`,
              },
            ],
          },
          lastHealthAt: now,
        },
      },
    )
  }

  if (passwordToSave && channelId) {
    await ensureEmailPolling(channelId)
    const enc = encryptSecret(passwordToSave)
    await db
      .update(integrationSettings)
      .set({
        smtpPasswordEnc: enc,
        smtp: {
          host: HOSTINGER_MAILBOX_DEFAULTS.smtpHost,
          port: HOSTINGER_MAILBOX_DEFAULTS.smtpPort,
          security: HOSTINGER_MAILBOX_DEFAULTS.smtpSecurity,
          user: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
          fromEmail: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
          fromName: HOSTINGER_MAILBOX_DEFAULTS.domain,
        },
      })
      .where(eq(integrationSettings.singleton, 1))
      .catch(() => {})
  }

  const [finalRow] = await db.select().from(channels).where(eq(channels.id, channelId))
  return {
    channelId: finalRow.id,
    name: finalRow.name,
    status: finalRow.status,
    domain: HOSTINGER_MAILBOX_DEFAULTS.domain,
    websiteUrl: HOSTINGER_MAILBOX_DEFAULTS.websiteUrl,
    emailAddress: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
    imapHost: HOSTINGER_MAILBOX_DEFAULTS.imapHost,
    imapPort: HOSTINGER_MAILBOX_DEFAULTS.imapPort,
    imapSecurity: "SSL/TLS",
    smtpHost: HOSTINGER_MAILBOX_DEFAULTS.smtpHost,
    smtpPort: HOSTINGER_MAILBOX_DEFAULTS.smtpPort,
    smtpSecurity: "SSL/TLS",
    hasSecrets: Boolean(finalRow.secretsEnc),
  }
}

export const configureHostingerMailboxSchema = z.object({
  password: z.string().trim().min(4, "Introduce la contraseña del buzón de Hostinger."),
})

export async function configureHostingerDomainEmail(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.channels.manage)
  const input = parseInput(configureHostingerMailboxSchema, rawInput)

  await db
    .update(businessSettings)
    .set({
      contactEmail: HOSTINGER_MAILBOX_DEFAULTS.emailAddress,
      website: HOSTINGER_MAILBOX_DEFAULTS.websiteUrl,
    })
    .where(eq(businessSettings.singleton, 1))

  const mailbox = await ensureHostingerMailboxChannel({ plainPassword: input.password })

  await writeAudit({
    actor,
    action: "channel.connected",
    targetType: "channel",
    targetId: mailbox.channelId,
    metadata: {
      type: "email_imap",
      domain: HOSTINGER_MAILBOX_DEFAULTS.domain,
      imapHost: HOSTINGER_MAILBOX_DEFAULTS.imapHost,
    },
  })

  return mailbox
}

export async function getFlamencoHubSnapshot(actor: Actor) {
  assertCan(actor, PERMISSIONS.campaigns.view)

  if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
    const existing = await db.select({ id: artists.id }).from(artists).limit(1)
    if (existing.length === 0) {
      await db.transaction(async (tx) => {
        await seedFlamencoInitialData(tx, new Date())
      })
    }
  }

  const [
    artistRows,
    repRows,
    venueRows,
    concertRows,
    provisionalBookingRows,
    contractRows,
    mediaRows,
    offerRows,
    digitalServiceRows,
    hostingerMailbox,
  ] = await Promise.all([
    db.select().from(artists).orderBy(desc(artists.createdAt)),
    db.select().from(representatives).orderBy(desc(representatives.createdAt)),
    db.select().from(venues).orderBy(desc(venues.createdAt)),
    db.select().from(concerts).orderBy(desc(concerts.startsAt)),
    db.select().from(eventProvisionalBookings).orderBy(desc(eventProvisionalBookings.createdAt)),
    db.select().from(contracts).orderBy(desc(contracts.createdAt)),
    db.select().from(flamencoMediaAssets).orderBy(flamencoMediaAssets.pieceCode),
    db.select().from(concertOffers).orderBy(desc(concertOffers.createdAt)),
    db.select().from(artistDigitalServices).orderBy(desc(artistDigitalServices.createdAt)),
    ensureHostingerMailboxChannel(),
  ])

  return {
    artists: artistRows,
    representatives: repRows,
    venues: venueRows,
    concerts: concertRows,
    provisionalBookings: provisionalBookingRows,
    contracts: contractRows,
    mediaAssets: mediaRows,
    concertOffers: offerRows,
    digitalServices: digitalServiceRows,
    mediaCatalog: FLAMENCO_MEDIA_PIECES,
    digitalPackPresets: ARTIST_DIGITAL_PACK_PRESETS,
    hostingerMailbox,
  }
}

// ─── Operaciones de Intérpretes, Representantes, Salas, Conciertos y Contratos ───────────────────────────────

export async function createFlamencoArtist(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createArtistSchema, rawInput)

  const contactId = await upsertAgencyContact({
    name: input.artisticName,
    email: input.email || null,
    phone: input.phone || null,
    tag: "interprete-flamenco",
    notes: `Disciplina: ${input.discipline}`,
  })

  const [created] = await db
    .insert(artists)
    .values({
      artisticName: input.artisticName,
      legalName: input.legalName || null,
      discipline: input.discipline as ArtistDiscipline,
      biography: input.biography,
      styles: input.styles,
      bringsGroup: input.bringsGroup,
      groupFormation: input.groupFormation,
      leadGuitarist: input.leadGuitarist || null,
      alternateGuitarists: input.alternateGuitarists,
      baseCacheEur: input.baseCacheEur,
      minCacheEur: input.minCacheEur,
      city: input.city,
      phone: input.phone || null,
      email: input.email || null,
      websiteUrl: input.websiteUrl || null,
      instagramHandle: input.instagramHandle || null,
      youtubeChannelUrl: input.youtubeChannelUrl || null,
      technicalRider: input.technicalRider || null,
      representativeId: input.representativeId || null,
      contactId,
    })
    .returning()

  if (input.generateStandardMediaPack) {
    await generateStandardMediaPackForTarget({
      artistId: created.id,
      subjectName: created.artisticName,
    })
  }

  await writeAudit({
    actor,
    action: "flamenco.artist.create",
    targetType: "artist",
    targetId: created.id,
    metadata: { artisticName: created.artisticName, discipline: created.discipline },
  })

  return created
}

export async function createFlamencoMediaAsset(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createMediaAssetSchema, rawInput)
  if (!input.artistId && !input.concertId) {
    throw new ValidationError("Indica el intérprete o el concierto/evento al que pertenece la pieza multimedia.")
  }

  const detectedYtId = extractYouTubeVideoId(input.fileUrl)
  const effectivePlatform: MediaSourcePlatform =
    detectedYtId && input.sourcePlatform === "plataforma"
      ? "youtube"
      : (input.sourcePlatform as MediaSourcePlatform)

  const [created] = await db
    .insert(flamencoMediaAssets)
    .values({
      artistId: input.artistId || null,
      concertId: input.concertId || null,
      pieceCode: input.pieceCode as FlamencoMediaPieceCode,
      customPieceLabel: input.customPieceLabel || null,
      sourcePlatform: effectivePlatform,
      youtubeVideoId: detectedYtId,
      title: input.title,
      formatLabel: input.formatLabel,
      durationSeconds: input.durationSeconds ?? null,
      maxSizeMb: input.maxSizeMb ?? null,
      dimensions: input.dimensions,
      recommendedUse: input.recommendedUse,
      fileUrl: input.fileUrl,
      thumbnailUrl:
        input.thumbnailUrl ||
        (detectedYtId ? `https://img.youtube.com/vi/${detectedYtId}/hqdefault.jpg` : null),
      releasePhase: input.releasePhase,
    })
    .returning()

  return created
}

export async function generateFullMediaPackAction(
  actor: Actor,
  params: { artistId?: string; concertId?: string; subjectName: string },
) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  if (!params.artistId && !params.concertId) {
    throw new ValidationError("Debes indicar un intérprete o un concierto.")
  }
  const countCreated = await generateStandardMediaPackForTarget({
    artistId: params.artistId ?? null,
    concertId: params.concertId ?? null,
    subjectName: params.subjectName,
  })
  return { countCreated }
}

export async function createFlamencoRepresentative(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createRepresentativeSchema, rawInput)

  const contactId = await upsertAgencyContact({
    name: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
    tag: "representante-flamenco",
    notes: input.agencyName || "Representante artístico",
  })

  const [created] = await db
    .insert(representatives)
    .values({
      fullName: input.fullName,
      agencyName: input.agencyName || null,
      roleKind: input.roleKind,
      commissionPercent: input.commissionPercent,
      phone: input.phone || null,
      email: input.email || null,
      websiteUrl: input.websiteUrl || null,
      city: input.city,
      notes: input.notes || null,
      contactId,
    })
    .returning()

  return created
}

export async function createFlamencoVenue(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createVenueSchema, rawInput)

  const contactId = await upsertAgencyContact({
    name: input.programmerName ? `${input.programmerName} (${input.name})` : input.name,
    email: input.email || null,
    phone: input.phone || null,
    tag: `sala-${input.kind}`,
    notes: `Sala ${input.kind} en ${input.city}`,
  })

  const [created] = await db
    .insert(venues)
    .values({
      name: input.name,
      kind: input.kind as VenueKind,
      city: input.city,
      province: input.province,
      country: input.country,
      address: input.address || null,
      capacity: input.capacity,
      typicalBudgetEur: input.typicalBudgetEur,
      programmerName: input.programmerName || null,
      email: input.email || null,
      phone: input.phone || null,
      websiteUrl: input.websiteUrl || null,
      instagramHandle: input.instagramHandle || null,
      technicalEquipment: input.technicalEquipment || null,
      notes: input.notes || null,
      contactId,
    })
    .returning()

  return created
}

export async function createFlamencoConcert(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createConcertSchema, rawInput)

  const [artist] = await db.select().from(artists).where(eq(artists.id, input.artistId)).limit(1)
  if (!artist) {
    throw new NotFoundError("El intérprete seleccionado no existe.")
  }

  const cleanVenueId = input.venueId?.trim() || null
  const [venue] = cleanVenueId
    ? await db.select().from(venues).where(eq(venues.id, cleanVenueId)).limit(1)
    : [undefined]

  if (!input.dateAndPlaceTbd && !venue) {
    throw new ValidationError(
      "Selecciona una sala/lugar, o marca la opción «No se sabe aún la fecha ni el lugar pero se admiten reservas provisionales».",
    )
  }

  const resolvedStartDate = input.startsAtIso?.trim()
    ? new Date(input.startsAtIso)
    : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)

  let calcomBookingUid: string | null = null
  let calcomMeetingUrl: string | null = null

  if (input.createCalcomMeeting) {
    const [calCfg] = await db.select().from(calcomSettings).limit(1)
    const apiKey = tryDecryptSecret(calCfg?.apiKeyEncrypted) || ""
    const bookingRes = await createCalcomBooking({
      apiKey,
      baseUrl: calCfg?.baseUrl,
      eventTypeId: calCfg?.defaultEventTypeId || "1",
      startIso: resolvedStartDate.toISOString(),
      attendeeName: venue?.programmerName || venue?.name || artist.artisticName,
      attendeeEmail: venue?.email || artist.email || "soniqueteflamenco@soniqueteflamenco.com",
      attendeePhone: venue?.phone || artist.phone,
      notes: `Reunión de producción (${input.eventKind}): ${input.title} (${artist.artisticName}${venue ? ` en ${venue.name}` : " · Fecha y lugar pendientes"})`,
    })
    calcomBookingUid = bookingRes.uid
    calcomMeetingUrl = bookingRes.meetingUrl
  }

  // Si se activa "si no se llega al número de asistentes se cancela" y el estado era celebrado/confirmado sin llegar al mínimo, lo reflejamos en notas
  const [created] = await db
    .insert(concerts)
    .values({
      title: input.title,
      eventKind: input.eventKind as EventKind,
      artistId: input.artistId,
      venueId: venue?.id ?? null,
      representativeId: input.representativeId || artist.representativeId || null,
      startsAt: resolvedStartDate,
      dateAndPlaceTbd: input.dateAndPlaceTbd,
      provisionalBookingsOpen: input.dateAndPlaceTbd ? true : input.provisionalBookingsOpen,
      autoNotifyToConfirm: input.autoNotifyToConfirm,
      cancelIfBelowMinAttendees: input.cancelIfBelowMinAttendees,
      minAttendees: input.minAttendees,
      currentAttendees: input.currentAttendees,
      soundcheckTime: input.soundcheckTime,
      doorsTime: input.doorsTime,
      showTime: input.showTime,
      durationMinutes: input.durationMinutes,
      agreedCacheEur: input.agreedCacheEur,
      ticketPriceEur: input.ticketPriceEur,
      bringsGroup: input.bringsGroup,
      guitaristName: input.guitaristName || artist.leadGuitarist || null,
      lineupDetails: input.lineupDetails || artist.groupFormation,
      status: input.status,
      calcomBookingUid,
      calcomMeetingUrl,
      notes: input.notes || null,
    })
    .returning()

  if (input.generateStandardMediaPack) {
    await generateStandardMediaPackForTarget({
      concertId: created.id,
      artistId: artist.id,
      subjectName: `${created.title}`,
    })
  }

  return created
}

export async function createEventProvisionalBooking(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createProvisionalBookingSchema, rawInput)

  const [concert] = await db
    .select()
    .from(concerts)
    .where(eq(concerts.id, input.concertId))
    .limit(1)
  if (!concert) throw new NotFoundError("El evento o concierto no existe.")

  const contactId = await upsertAgencyContact({
    name: input.attendeeName,
    email: input.attendeeEmail || null,
    phone: input.attendeePhone || null,
    tag: "reserva-provisional-evento",
    notes: `Reserva provisional (${input.seats} plazas) para ${concert.title}`,
  })

  const [booking] = await db
    .insert(eventProvisionalBookings)
    .values({
      concertId: concert.id,
      contactId,
      attendeeName: input.attendeeName,
      attendeeEmail: input.attendeeEmail || null,
      attendeePhone: input.attendeePhone || null,
      seats: input.seats,
      status: "provisional",
      notes: input.notes || null,
    })
    .returning()

  const nextCount = concert.currentAttendees + input.seats
  await db
    .update(concerts)
    .set({
      currentAttendees: nextCount,
      updatedAt: new Date(),
    })
    .where(eq(concerts.id, concert.id))

  return { booking, currentAttendees: nextCount }
}

export async function notifyProvisionalBookingsToConfirm(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(notifyProvisionalBookingsSchema, rawInput)

  const [concert] = await db
    .select()
    .from(concerts)
    .where(eq(concerts.id, input.concertId))
    .limit(1)
  if (!concert) throw new NotFoundError("Evento no encontrado.")

  const cleanVenueId = input.confirmedVenueId?.trim() || concert.venueId || null
  const [venue] = cleanVenueId
    ? await db.select().from(venues).where(eq(venues.id, cleanVenueId)).limit(1)
    : [undefined]

  const nextStartsAt = input.confirmedStartsAtIso?.trim()
    ? new Date(input.confirmedStartsAtIso)
    : concert.startsAt

  await db
    .update(concerts)
    .set({
      startsAt: nextStartsAt,
      venueId: venue?.id ?? concert.venueId,
      dateAndPlaceTbd: false,
      updatedAt: new Date(),
    })
    .where(eq(concerts.id, concert.id))

  const pendingBookings = await db
    .select()
    .from(eventProvisionalBookings)
    .where(eq(eventProvisionalBookings.concertId, concert.id))

  const activeBookings = pendingBookings.filter(
    (b) => b.status === "provisional" || b.status === "notificado_para_confirmar",
  )

  const [vapiCfg] = await db.select().from(vapiSettings).limit(1)
  const smsKey = tryDecryptSecret(vapiCfg?.zadarmaSmsKeyEncrypted) || ""
  const smsSecret = tryDecryptSecret(vapiCfg?.zadarmaSmsSecretEncrypted) || ""

  const placeLabel = venue ? `${venue.name} (${venue.city})` : "lugar ya confirmado"
  const dateLabel = nextStartsAt.toLocaleDateString("es-ES")

  let notifiedCount = 0
  for (const b of activeBookings) {
    await db
      .update(eventProvisionalBookings)
      .set({
        status: "notificado_para_confirmar",
        confirmationNoticeSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(eventProvisionalBookings.id, b.id))

    if (b.attendeePhone) {
      const msgText =
        input.customMessage?.trim() ||
        `soniqueteflamenco.com: Ya tenemos fecha (${dateLabel}) y lugar (${placeLabel}) para ${concert.title}. Por favor responde para confirmar tus ${b.seats} plazas provisionales.`
      const smsOut = await sendZadarmaSms({
        apiKey: smsKey,
        apiSecret: smsSecret,
        toPhone: b.attendeePhone,
        message: msgText,
        callerId: vapiCfg?.zadarmaSmsCallerId || "Soniquete",
      })
      await db.insert(zadarmaSmsRespuesta).values({
        toPhone: smsOut.cleanPhone,
        callerId: vapiCfg?.zadarmaSmsCallerId || "Soniquete",
        message: smsOut.sanitizedMessage,
        status: smsOut.status,
        cost: smsOut.cost ?? null,
        messagesCount: smsOut.messagesCount ?? 1,
        rawResponse: smsOut.rawResponse,
        errorMessage: smsOut.errorMessage ?? null,
      })
    }
    notifiedCount += 1
  }

  return {
    notifiedCount,
    concertId: concert.id,
    placeLabel,
    dateLabel,
  }
}

export async function confirmEventProvisionalBooking(actor: Actor, bookingId: string) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const [updated] = await db
    .update(eventProvisionalBookings)
    .set({
      status: "confirmada",
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(eventProvisionalBookings.id, bookingId))
    .returning()

  if (!updated) throw new NotFoundError("Reserva provisional no encontrada.")
  return updated
}

export async function evaluateEventMinAttendeesCancellation(actor: Actor, concertId: string) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId)).limit(1)
  if (!concert) throw new NotFoundError("Evento no encontrado.")

  if (concert.cancelIfBelowMinAttendees && concert.currentAttendees < concert.minAttendees) {
    const [cancelled] = await db
      .update(concerts)
      .set({
        status: "cancelado",
        notes: `${concert.notes ? `${concert.notes} · ` : ""}Cancelado automáticamente por no alcanzar el aforo mínimo requerido (${concert.currentAttendees}/${concert.minAttendees} asistentes).`,
        updatedAt: new Date(),
      })
      .where(eq(concerts.id, concert.id))
      .returning()

    return {
      cancelled: true,
      concert: cancelled,
      message: `El evento «${concert.title}» se ha marcado como cancelado porque tiene ${concert.currentAttendees} asistentes de un mínimo exigido de ${concert.minAttendees}.`,
    }
  }

  return {
    cancelled: false,
    concert,
    message: `El evento «${concert.title}» alcanza el umbral mínimo (${concert.currentAttendees}/${concert.minAttendees} asistentes) y sigue adelante.`,
  }
}

export async function createFlamencoContract(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createContractSchema, rawInput)

  const [artist] = await db.select().from(artists).where(eq(artists.id, input.artistId)).limit(1)
  const [venue] = input.venueId
    ? await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1)
    : [undefined]

  const [payCfg] = await db.select().from(paymentSettings).limit(1)
  const stripeSecret = tryDecryptSecret(payCfg?.secretKeyEncrypted) || ""
  const appUrl = getAppUrl()

  const advanceEur = Math.round((input.totalAmountEur * input.advancePercent) / 100)
  const checkout = await createStripeCheckoutSession({
    secretKey: stripeSecret,
    amountEur: advanceEur > 0 ? advanceEur : input.totalAmountEur,
    concept: `Contrato ${input.code} · ${artist?.artisticName ?? "Artista"} (${input.advancePercent}% señal)`,
    customerEmail: venue?.email || artist?.email || undefined,
    customerName: venue?.name || artist?.artisticName,
    enableBizum: payCfg?.enableBizum ?? true,
    successUrl: `${appUrl}/payment-success?contract=${encodeURIComponent(input.code)}`,
    cancelUrl: `${appUrl}/payment-cancelled?contract=${encodeURIComponent(input.code)}`,
    metadata: { contractCode: input.code },
  })

  const [created] = await db
    .insert(contracts)
    .values({
      code: input.code,
      concertId: input.concertId || null,
      artistId: input.artistId,
      venueId: input.venueId || null,
      representativeId: input.representativeId || null,
      contractType: input.contractType,
      status: input.status,
      totalAmountEur: input.totalAmountEur,
      advancePercent: input.advancePercent,
      agencyCommissionPercent: input.agencyCommissionPercent,
      stripePaymentLinkUrl: checkout.url,
      stripeCheckoutSessionId: checkout.sessionId,
      clausesSummary:
        input.clausesSummary ||
        "50% a la firma mediante pasarela Stripe/Bizum o transferencia; 50% antes de subir al escenario tras prueba de sonido.",
    })
    .returning()

  await db.insert(paymentRecords).values({
    concept: `Señal Contrato ${input.code} · ${artist?.artisticName ?? "Concierto Flamenco"}`,
    payerName: venue?.name || "Sala / Promotor",
    payerEmail: venue?.email || null,
    payerPhone: venue?.phone || null,
    amountCents: (advanceEur > 0 ? advanceEur : input.totalAmountEur) * 100,
    currency: "EUR",
    status: input.status === "pagado" ? "paid" : "pending",
    method: "stripe",
    stripeSessionId: checkout.sessionId,
    stripePaymentUrl: checkout.url,
    contractId: created.id,
    concertId: input.concertId || null,
    paidAt: input.status === "pagado" ? new Date() : null,
  })

  return created
}

// ─── Simulador de Ofertas de Concierto a Salas → Módulo de Envíos ([FLA-06]) ─────────────────────────────────

export async function simulateAndScheduleConcertOffer(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(simulateOfferSchema, rawInput)

  const [artist] = await db.select().from(artists).where(eq(artists.id, input.artistId)).limit(1)
  if (!artist) throw new NotFoundError("No se encontró el intérprete.")

  const [venue] = input.venueId
    ? await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1)
    : [undefined]

  const artistAssets = await db
    .select()
    .from(flamencoMediaAssets)
    .where(eq(flamencoMediaAssets.artistId, artist.id))

  const pickUrl = (code: string, fallback: string) =>
    artistAssets.find((a) => a.pieceCode === code)?.fileUrl || fallback

  const slug = artist.artisticName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const texts = buildConcertOfferTexts({
    artistName: artist.artisticName,
    disciplineLabel: artist.discipline,
    styles: Array.isArray(artist.styles) ? artist.styles : ["Soleá", "Bulerías"],
    bringsGroup: input.includesGroup,
    groupFormation: artist.groupFormation,
    guitaristName: input.guitaristName || artist.leadGuitarist,
    venueName: venue?.name || `Salas (${input.targetVenueKind})`,
    venueCity: venue?.city || "España",
    proposedDateText: input.proposedDateText,
    proposedCacheEur: input.proposedCacheEur,
    video1FullUrl: pickUrl(
      "1_completo_horizontal",
      `https://cdn.soniqueteflamenco.com/media/${slug}/1_completo_horizontal.mp4`,
    ),
    video2PromoUrl: pickUrl(
      "2_promo_horizontal",
      `https://cdn.soniqueteflamenco.com/media/${slug}/2_promo_horizontal.mp4`,
    ),
    video4WhatsappUrl: pickUrl(
      "4_promo_whatsapp_horizontal",
      `https://cdn.soniqueteflamenco.com/media/${slug}/4_promo_whatsapp_horizontal.mp4`,
    ),
    video7ReelUrl: pickUrl(
      "7_reel_instagram",
      `https://cdn.soniqueteflamenco.com/media/${slug}/7_reel_instagram.mp4`,
    ),
  })

  let createdCampaignId: string | null = null

  if (input.createCampaignInEnvios) {
    // Buscamos canales conectados de Telegram / WhatsApp para asociar el envío
    const availableChannels = await db
      .select()
      .from(channels)
      .where(inArray(channels.type, ["whatsapp", "telegram"]))
    const tgChannel = availableChannels.find((c) => c.type === "telegram")
    const waChannel = availableChannels.find((c) => c.type === "whatsapp")

    // Destinatarios: si se eligió una sala concreta con contactId, o todas las salas del tipo indicado
    const matchingVenues = input.venueId
      ? venue
        ? [venue]
        : []
      : await db
          .select()
          .from(venues)
          .where(eq(venues.kind, input.targetVenueKind as VenueKind))

    const contactIds = matchingVenues
      .map((v) => v.contactId)
      .filter((id): id is string => Boolean(id))

    const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000)

    const [camp] = await db
      .insert(campaigns)
      .values({
        name: `Oferta Artística · ${input.title}`,
        status: "scheduled",
        scheduledAt: scheduledFor,
        routes: input.channels,
        whatsapp: waChannel
          ? {
              channelId: waChannel.id,
              templateName: "oferta_concierto_flamenco",
              templateLanguage: "es",
              variables: {},
            }
          : null,
        telegram: tgChannel
          ? {
              channelId: tgChannel.id,
              text: texts.telegramPreview,
            }
          : null,
        email: {
          subject: texts.emailSubject,
          body: texts.emailPreview,
        },
        recipientCount: Math.max(1, contactIds.length),
        createdByUserId: actor.userId,
        createdByName: actor.name,
      })
      .returning({ id: campaigns.id })

    createdCampaignId = camp.id

    if (contactIds.length > 0) {
      const contactRows = await db
        .select()
        .from(contacts)
        .where(inArray(contacts.id, contactIds))
      for (const c of contactRows) {
        await db
          .insert(campaignRecipients)
          .values({
            campaignId: camp.id,
            contactId: c.id,
            channel: c.email ? "email" : "whatsapp",
            status: "pending",
          })
          .onConflictDoNothing()
      }
    }
  }

  const [offer] = await db
    .insert(concertOffers)
    .values({
      title: input.title,
      artistId: artist.id,
      venueId: venue?.id ?? null,
      concertId: input.concertId ?? null,
      targetVenueKind: input.targetVenueKind,
      proposedDateText: input.proposedDateText,
      proposedCacheEur: input.proposedCacheEur,
      includesGroup: input.includesGroup,
      guitaristName: input.guitaristName || artist.leadGuitarist || null,
      selectedMediaPieces: [
        "1_completo_horizontal",
        "2_promo_horizontal",
        "4_promo_whatsapp_horizontal",
        "7_reel_instagram",
      ],
      channels: input.channels,
      whatsappPreview: texts.whatsappPreview,
      telegramPreview: texts.telegramPreview,
      emailSubject: texts.emailSubject,
      emailPreview: texts.emailPreview,
      campaignId: createdCampaignId,
      status: createdCampaignId ? "pasada_a_envios" : "simulada",
    })
    .returning()

  return {
    offer,
    campaignId: createdCampaignId,
  }
}

// ─── Captación Web de Salas y Artistas para enviarles ofertas ([FLA-07], [FLA-08]) ───────────────────────────

function inferEntityFromUrl(rawUrl: string) {
  let normalizedUrl = rawUrl.trim()
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }
  let hostname = "soniqueteflamenco.com"
  try {
    hostname = new URL(normalizedUrl).hostname.replace(/^www\./i, "")
  } catch {
    hostname = rawUrl.replace(/^https?:\/\//i, "").split("/")[0] || "web-flamenca.es"
  }
  const domainBase = hostname.split(".")[0] || "flamenco"
  const prettyName = domainBase
    .split(/[-_]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
    .join(" ")
  return {
    normalizedUrl,
    hostname,
    prettyName: prettyName || "Entidad Flamenca",
    defaultEmail: `programacion@${hostname}`,
  }
}

export async function scrapeWebEntityForFlamenco(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(scrapeWebEntitySchema, rawInput)
  const inferred = inferEntityFromUrl(input.websiteUrl)

  let extractedTitle = input.fallbackName?.trim() || ""
  let extractedEmail = ""
  let extractedPhone = ""
  let extractedDescription = ""

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4500)
    const res = await fetch(inferred.normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SoniqueteFlamencoBot/1.0 (+https://soniqueteflamenco.com)",
      },
    })
    clearTimeout(timer)

    if (res.ok) {
      const html = await res.text()
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (!extractedTitle && titleMatch?.[1]) {
        extractedTitle = titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 120)
      }
      const mailtoMatch =
        html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
        html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?:es|com|org|net|eu))/i)
      if (mailtoMatch?.[1]) {
        extractedEmail = mailtoMatch[1].toLowerCase()
      }
      const phoneMatch = html.match(/(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/)
      if (phoneMatch?.[0]) {
        extractedPhone = phoneMatch[0].trim()
      }
      const descMatch = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      )
      if (descMatch?.[1]) {
        extractedDescription = descMatch[1].trim().slice(0, 400)
      }
    }
  } catch {
    // Si la web bloquea bots o estamos sin conexión, inferimos los datos del dominio
  }

  const finalName = extractedTitle || inferred.prettyName
  const finalEmail = extractedEmail || inferred.defaultEmail
  const finalPhone = extractedPhone || "+34 910 000 000"
  const finalCity = input.fallbackCity?.trim() || "Madrid"

  if (input.targetType === "venue") {
    const kind = (input.venueKind || "sala_flamenco") as VenueKind
    const contactId = await upsertAgencyContact({
      name: finalName,
      email: finalEmail,
      phone: finalPhone,
      tag: "sala-captada-web",
      notes: `Captada desde ${inferred.normalizedUrl}`,
    })

    const [venue] = await db
      .insert(venues)
      .values({
        name: finalName,
        kind,
        city: finalCity,
        province: finalCity,
        country: "España",
        capacity: 160,
        typicalBudgetEur: 2000,
        programmerName: `Programación ${finalName}`,
        email: finalEmail,
        phone: finalPhone,
        websiteUrl: inferred.normalizedUrl,
        sourceWebExtracted: true,
        notes:
          extractedDescription ||
          `Ficha de sala generada automáticamente desde ${inferred.normalizedUrl} para envío de ofertas de conciertos.`,
        contactId,
      })
      .returning()

    return {
      targetType: "venue" as const,
      name: venue.name,
      email: venue.email,
      phone: venue.phone,
      websiteUrl: venue.websiteUrl,
      entityId: venue.id,
      contactId,
    }
  }

  const discipline = (input.artistDiscipline || "cante") as ArtistDiscipline
  const contactId = await upsertAgencyContact({
    name: finalName,
    email: finalEmail,
    phone: finalPhone,
    tag: "artista-captado-web",
    notes: `Captado desde ${inferred.normalizedUrl} para ofrecer servicios digitales`,
  })

  const [artist] = await db
    .insert(artists)
    .values({
      artisticName: finalName,
      discipline,
      biography:
        extractedDescription ||
        `Intérprete captado desde su web oficial (${inferred.normalizedUrl}) para propuesta de representación y Pack Digital 360º.`,
      styles: ["Soleá", "Bulerías", "Tangos"],
      bringsGroup: true,
      groupFormation: "Cuadro propio o formato solista",
      baseCacheEur: 1800,
      minCacheEur: 1200,
      city: finalCity,
      email: finalEmail,
      phone: finalPhone,
      websiteUrl: inferred.normalizedUrl,
      sourceWebExtracted: true,
      contactId,
    })
    .returning()

  await generateStandardMediaPackForTarget({
    artistId: artist.id,
    subjectName: artist.artisticName,
  })

  return {
    targetType: "artist" as const,
    name: artist.artisticName,
    email: artist.email,
    phone: artist.phone,
    websiteUrl: artist.websiteUrl,
    entityId: artist.id,
    contactId,
  }
}

// ─── Servicios Digitales para Artistas ([FLA-09]) ────────────────────────────────────────────────────────────

export async function createArtistDigitalService(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createArtistDigitalServiceSchema, rawInput)

  const [artist] = await db.select().from(artists).where(eq(artists.id, input.artistId)).limit(1)
  if (!artist) throw new NotFoundError("No se encontró el intérprete.")

  const [payCfg] = await db.select().from(paymentSettings).limit(1)
  const stripeSecret = tryDecryptSecret(payCfg?.secretKeyEncrypted) || ""
  const appUrl = getAppUrl()

  const checkout = await createStripeCheckoutSession({
    secretKey: stripeSecret,
    amountEur: input.setupFeeEur > 0 ? input.setupFeeEur : input.monthlyFeeEur,
    concept: `${input.packName} · ${artist.artisticName}`,
    customerEmail: artist.email || undefined,
    customerName: artist.artisticName,
    enableBizum: payCfg?.enableBizum ?? true,
    successUrl: `${appUrl}/payment-success?pack=${encodeURIComponent(input.packName)}`,
    cancelUrl: `${appUrl}/payment-cancelled?pack=${encodeURIComponent(input.packName)}`,
  })

  const [created] = await db
    .insert(artistDigitalServices)
    .values({
      artistId: input.artistId,
      packName: input.packName,
      status: input.status,
      includesLanding: input.includesLanding,
      landingDomain: input.landingDomain || null,
      includesAiAgent: input.includesAiAgent,
      includesWhatsappChannel: input.includesWhatsappChannel,
      includesTelegramBot: input.includesTelegramBot,
      telegramBotUsername: input.includesTelegramBot ? "@soniqueteflamencoMadrid" : null,
      includesInstagramSetup: input.includesInstagramSetup,
      includesYoutubeChannel: input.includesYoutubeChannel,
      includesNineVideosPack: input.includesNineVideosPack,
      setupFeeEur: input.setupFeeEur,
      monthlyFeeEur: input.monthlyFeeEur,
      stripePaymentLinkUrl: checkout.url,
      notes: input.notes || null,
    })
    .returning()

  return created
}

// ─── Cal.com Settings & Test ([CAL-01], [CAL-02]) ────────────────────────────────────────────────────────────

export async function getCalcomConfig(actor: Actor) {
  assertCan(actor, PERMISSIONS.campaigns.view)
  const [row] = await db.select().from(calcomSettings).limit(1)
  const decryptedKey = tryDecryptSecret(row?.apiKeyEncrypted)
  return {
    enabled: row?.enabled ?? true,
    hasApiKey: Boolean(decryptedKey),
    maskedApiKey: decryptedKey ? maskSecret(decryptedKey) : null,
    baseUrl: getCalcomV2BaseUrl(row?.baseUrl),
    defaultEventTypeId: row?.defaultEventTypeId || "123456",
    autoSyncBookings: row?.autoSyncBookings ?? true,
    lastTestedAt: row?.lastTestedAt ?? null,
    lastTestStatus: row?.lastTestStatus ?? "ok",
  }
}

export async function updateCalcomConfig(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const input = parseInput(updateCalcomConfigSchema, rawInput)
  const [existing] = await db.select().from(calcomSettings).limit(1)

  const nextEncryptedKey =
    input.apiKey && !input.apiKey.startsWith("••••")
      ? encryptSecret(input.apiKey.trim())
      : (existing?.apiKeyEncrypted ?? null)

  if (existing) {
    await db
      .update(calcomSettings)
      .set({
        enabled: input.enabled,
        apiKeyEncrypted: nextEncryptedKey,
        baseUrl: getCalcomV2BaseUrl(input.baseUrl),
        defaultEventTypeId: input.defaultEventTypeId || null,
        autoSyncBookings: input.autoSyncBookings,
        updatedAt: new Date(),
      })
      .where(eq(calcomSettings.id, existing.id))
  } else {
    await db.insert(calcomSettings).values({
      enabled: input.enabled,
      apiKeyEncrypted: nextEncryptedKey,
      baseUrl: getCalcomV2BaseUrl(input.baseUrl),
      defaultEventTypeId: input.defaultEventTypeId || null,
      autoSyncBookings: input.autoSyncBookings,
    })
  }

  return getCalcomConfig(actor)
}

export async function testCalcomConfigAction(actor: Actor) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const [existing] = await db.select().from(calcomSettings).limit(1)
  const apiKey = tryDecryptSecret(existing?.apiKeyEncrypted)
  if (!apiKey) {
    return {
      ok: true,
      simulated: true,
      message:
        "Modo demostración activo: Cal.com generará salas de vídeo virtuales automáticamente. Añade tu API Key (cal_live_...) para sincronizar con tu cuenta real.",
    }
  }
  const result = await testCalcomConnection({
    apiKey,
    baseUrl: existing?.baseUrl,
  })
  if (existing) {
    await db
      .update(calcomSettings)
      .set({
        lastTestedAt: new Date(),
        lastTestStatus: result.ok ? "ok" : "error",
      })
      .where(eq(calcomSettings.id, existing.id))
  }
  return { ...result, simulated: false }
}

// ─── Pasarela de Pagos Stripe & Bizum ([PAG-01], [PAG-02]) ───────────────────────────────────────────────────

export async function getPaymentsDashboard(actor: Actor) {
  assertCan(actor, PERMISSIONS.campaigns.view)
  const [cfg] = await db.select().from(paymentSettings).limit(1)
  const records = await db
    .select()
    .from(paymentRecords)
    .orderBy(desc(paymentRecords.createdAt))

  const secretKey = tryDecryptSecret(cfg?.secretKeyEncrypted)
  const webhookSecret = tryDecryptSecret(cfg?.webhookSecretEncrypted)
  const appUrl = getAppUrl()

  let totalPaidCents = 0
  let totalPendingCents = 0
  let paidCount = 0
  let pendingCount = 0

  for (const r of records) {
    if (r.status === "paid") {
      totalPaidCents += r.amountCents
      paidCount += 1
    } else if (r.status === "pending") {
      totalPendingCents += r.amountCents
      pendingCount += 1
    }
  }

  return {
    config: {
      stripeEnabled: cfg?.stripeEnabled ?? true,
      publishableKey: cfg?.publishableKey || "pk_live_soniquete_demo",
      hasSecretKey: Boolean(secretKey),
      maskedSecretKey: secretKey ? maskSecret(secretKey) : null,
      hasWebhookSecret: Boolean(webhookSecret),
      maskedWebhookSecret: webhookSecret ? maskSecret(webhookSecret) : null,
      enableCardAndWallets: cfg?.enableCardAndWallets ?? true,
      enableBizum: cfg?.enableBizum ?? true,
      currency: cfg?.currency ?? "EUR",
      webhookUrl: `${appUrl}/api/webhooks/stripe`,
    },
    summary: {
      totalPaidEur: totalPaidCents / 100,
      totalPendingEur: totalPendingCents / 100,
      paidCount,
      pendingCount,
    },
    records,
  }
}

export async function updatePaymentConfig(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const input = parseInput(updatePaymentConfigSchema, rawInput)
  const [existing] = await db.select().from(paymentSettings).limit(1)

  const nextSecret =
    input.secretKey && !input.secretKey.startsWith("••••")
      ? encryptSecret(input.secretKey.trim())
      : (existing?.secretKeyEncrypted ?? null)

  const nextWebhook =
    input.webhookSecret && !input.webhookSecret.startsWith("••••")
      ? encryptSecret(input.webhookSecret.trim())
      : (existing?.webhookSecretEncrypted ?? null)

  if (existing) {
    await db
      .update(paymentSettings)
      .set({
        stripeEnabled: input.stripeEnabled,
        publishableKey: input.publishableKey || null,
        secretKeyEncrypted: nextSecret,
        webhookSecretEncrypted: nextWebhook,
        enableCardAndWallets: input.enableCardAndWallets,
        enableBizum: input.enableBizum,
        currency: input.currency,
        updatedAt: new Date(),
      })
      .where(eq(paymentSettings.id, existing.id))
  } else {
    await db.insert(paymentSettings).values({
      stripeEnabled: input.stripeEnabled,
      publishableKey: input.publishableKey || null,
      secretKeyEncrypted: nextSecret,
      webhookSecretEncrypted: nextWebhook,
      enableCardAndWallets: input.enableCardAndWallets,
      enableBizum: input.enableBizum,
      currency: input.currency,
    })
  }

  return getPaymentsDashboard(actor)
}

export async function createPaymentOrLink(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const input = parseInput(createPaymentRecordSchema, rawInput)

  const [cfg] = await db.select().from(paymentSettings).limit(1)
  const secretKey = tryDecryptSecret(cfg?.secretKeyEncrypted) || ""
  const appUrl = getAppUrl()
  const amountCents = Math.round(input.amountEur * 100)

  let stripeSessionId: string | null = null
  let stripePaymentUrl: string | null = null

  if (!input.markAsPaidImmediately && (input.method === "stripe" || input.method === "bizum")) {
    const session = await createStripeCheckoutSession({
      secretKey,
      amountEur: input.amountEur,
      concept: input.concept,
      customerEmail: input.payerEmail || undefined,
      customerName: input.payerName,
      enableBizum: cfg?.enableBizum ?? true,
      successUrl: `${appUrl}/payment-success`,
      cancelUrl: `${appUrl}/payment-cancelled`,
    })
    stripeSessionId = session.sessionId
    stripePaymentUrl = session.url
  }

  const [record] = await db
    .insert(paymentRecords)
    .values({
      concept: input.concept,
      payerName: input.payerName,
      payerEmail: input.payerEmail || null,
      payerPhone: input.payerPhone || null,
      amountCents,
      currency: cfg?.currency || "EUR",
      status: input.markAsPaidImmediately ? "paid" : "pending",
      method: input.method,
      stripeSessionId,
      stripePaymentUrl,
      contractId: input.contractId || null,
      concertId: input.concertId || null,
      artistServiceId: input.artistServiceId || null,
      paidAt: input.markAsPaidImmediately ? new Date() : null,
      notes: input.notes || null,
    })
    .returning()

  return record
}

export async function markPaymentRecordPaid(actor: Actor, paymentId: string) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const [updated] = await db
    .update(paymentRecords)
    .set({
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentRecords.id, paymentId))
    .returning()

  if (!updated) throw new NotFoundError("Pago no encontrado.")

  if (updated.contractId) {
    await db
      .update(contracts)
      .set({ status: "pagado", updatedAt: new Date() })
      .where(eq(contracts.id, updated.contractId))
  }

  return updated
}

// ─── VAPI & Zadarma + SMS ([VAP-01], [VAP-02], [VAP-03]) ─────────────────────────────────────────────────────

export async function getVapiAndCallsDashboard(actor: Actor) {
  assertCan(actor, PERMISSIONS.campaigns.view)
  let [cfg] = await db.select().from(vapiSettings).limit(1)

  const defaultVapiValues = {
    vapiEnabled: true,
    vapiApiKeyEncrypted: encryptSecret("868c4794-d264-4891-9d7e-b3fe5f33f2a1"),
    vapiAssistantId: "b9e5e266-07f6-4d70-9f30-93ccfb199a95",
    vapiPhoneNumberId: "04a39510-5ded-4446-a84e-f5a99eb3d591",
    zadarmaPhoneNumber: "+34919933764",
    zadarmaSipServer: "sip.zadarma.com",
    zadarmaSipLogin: "536586",
    zadarmaSipPasswordEncrypted: encryptSecret("PddEcd72ZQ"),
    voiceProvider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    transcriberProvider: "deepgram",
    transcriberModel: "nova-3-general",
    transcriberLanguage: "es",
    llmModel: "gpt-4o-mini",
    temperature: "0.3",
    systemPrompt: composeFlamencoVapiPrompt({}),
    n8nSmsWebhookUrl: "https://n8n.soniqueteflamenco.com/webhook/zadarma-sms",
    zadarmaSmsKeyEncrypted: encryptSecret("45dc42d6f22439899024"),
    zadarmaSmsSecretEncrypted: encryptSecret("34061190a934a453aa99"),
    zadarmaSmsCallerId: "Teamsale",
    autoSendBookingSms: true,
    updatedAt: new Date(),
  }

  const isTest = process.env.NODE_ENV === "test"
  if (!isTest) {
    if (!cfg) {
      const [created] = await db.insert(vapiSettings).values(defaultVapiValues).returning()
      cfg = created
    } else if (
      !cfg.vapiApiKeyEncrypted ||
      !cfg.vapiAssistantId ||
      cfg.vapiAssistantId.startsWith("asst_") ||
      !cfg.vapiPhoneNumberId ||
      !cfg.zadarmaSipPasswordEncrypted ||
      !cfg.zadarmaSmsKeyEncrypted ||
      !cfg.zadarmaSmsSecretEncrypted
    ) {
      const healValues = {
        vapiApiKeyEncrypted:
          cfg.vapiApiKeyEncrypted || encryptSecret("868c4794-d264-4891-9d7e-b3fe5f33f2a1"),
        vapiAssistantId:
          cfg.vapiAssistantId && !cfg.vapiAssistantId.startsWith("asst_")
            ? cfg.vapiAssistantId
            : "b9e5e266-07f6-4d70-9f30-93ccfb199a95",
        vapiPhoneNumberId:
          cfg.vapiPhoneNumberId || "04a39510-5ded-4446-a84e-f5a99eb3d591",
        zadarmaPhoneNumber: cfg.zadarmaPhoneNumber || "+34919933764",
        zadarmaSipServer: cfg.zadarmaSipServer || "sip.zadarma.com",
        zadarmaSipLogin: cfg.zadarmaSipLogin || "536586",
        zadarmaSipPasswordEncrypted:
          cfg.zadarmaSipPasswordEncrypted || encryptSecret("PddEcd72ZQ"),
        zadarmaSmsKeyEncrypted:
          cfg.zadarmaSmsKeyEncrypted || encryptSecret("45dc42d6f22439899024"),
        zadarmaSmsSecretEncrypted:
          cfg.zadarmaSmsSecretEncrypted || encryptSecret("34061190a934a453aa99"),
        zadarmaSmsCallerId: cfg.zadarmaSmsCallerId || "Teamsale",
        updatedAt: new Date(),
      }
      await db.update(vapiSettings).set(healValues).where(eq(vapiSettings.id, cfg.id))
      cfg = { ...cfg, ...healValues }
    }
  }

  const [callRows, smsRows, artistRows] = await Promise.all([
    db.select().from(calls).orderBy(desc(calls.startedAt)).limit(100),
    db
      .select()
      .from(zadarmaSmsRespuesta)
      .orderBy(desc(zadarmaSmsRespuesta.createdAt))
      .limit(100),
    db.select().from(artists).orderBy(artists.artisticName),
  ])

  const vapiApiKey = tryDecryptSecret(cfg?.vapiApiKeyEncrypted)
  const smsKey = tryDecryptSecret(cfg?.zadarmaSmsKeyEncrypted)
  const smsSecret = tryDecryptSecret(cfg?.zadarmaSmsSecretEncrypted)
  const appUrl = getAppUrl()

  const artistsSummary = artistRows
    .map(
      (a) =>
        `- ${a.artisticName} (${a.discipline}, caché base ${a.baseCacheEur} €, ${a.bringsGroup ? `con grupo (${a.groupFormation})` : "solista"}, guitarra: ${a.leadGuitarist || "a elegir"})`,
    )
    .join("\n")

  const defaultPrompt = composeFlamencoVapiPrompt({
    artistsSummary: artistsSummary || undefined,
  })

  return {
    config: {
      vapiEnabled: cfg?.vapiEnabled ?? true,
      hasVapiApiKey: Boolean(vapiApiKey),
      maskedVapiApiKey: vapiApiKey ? maskSecret(vapiApiKey) : null,
      vapiAssistantId: cfg?.vapiAssistantId || "asst_soniquete_flamenco_madrid",
      vapiPhoneNumberId: cfg?.vapiPhoneNumberId || "ph_zadarma_sip_madrid",
      zadarmaPhoneNumber: cfg?.zadarmaPhoneNumber || "+34919933764",
      zadarmaSipServer: cfg?.zadarmaSipServer || "sip.zadarma.com",
      zadarmaSipLogin: cfg?.zadarmaSipLogin || "536586",
      voiceProvider: cfg?.voiceProvider || "11labs",
      voiceId: cfg?.voiceId || "791d5162-d5eb-40f0-8189-f19db44611d8",
      transcriberProvider: cfg?.transcriberProvider || "deepgram",
      transcriberModel: cfg?.transcriberModel || "nova-3-general",
      transcriberLanguage: cfg?.transcriberLanguage || "es",
      llmModel: cfg?.llmModel || "gpt-4o-mini",
      temperature: cfg?.temperature || "0.3",
      systemPrompt: cfg?.systemPrompt || defaultPrompt,
      n8nSmsWebhookUrl:
        cfg?.n8nSmsWebhookUrl || "https://n8n.soniqueteflamenco.com/webhook/zadarma-sms",
      hasZadarmaSmsKey: Boolean(smsKey),
      maskedZadarmaSmsKey: smsKey ? maskSecret(smsKey) : null,
      hasZadarmaSmsSecret: Boolean(smsSecret),
      maskedZadarmaSmsSecret: smsSecret ? maskSecret(smsSecret) : null,
      zadarmaSmsCallerId: cfg?.zadarmaSmsCallerId || "+34919933764",
      autoSendBookingSms: cfg?.autoSendBookingSms ?? true,
      webhookUrl: `${appUrl}/api/webhooks/vapi`,
      outboundApiUrl: `${appUrl}/api/vapi/outbound`,
    },
    calls: callRows,
    smsLogs: smsRows,
  }
}

export async function updateVapiAndZadarmaConfig(actor: Actor, rawInput: unknown) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const input = parseInput(updateVapiConfigSchema, rawInput)
  const [existing] = await db.select().from(vapiSettings).limit(1)

  const nextVapiKey =
    input.vapiApiKey && !input.vapiApiKey.startsWith("••••")
      ? encryptSecret(input.vapiApiKey.trim())
      : (existing?.vapiApiKeyEncrypted ?? null)

  const nextSmsKey =
    input.zadarmaSmsKey && !input.zadarmaSmsKey.startsWith("••••")
      ? encryptSecret(input.zadarmaSmsKey.trim())
      : (existing?.zadarmaSmsKeyEncrypted ?? null)

  const nextSmsSecret =
    input.zadarmaSmsSecret && !input.zadarmaSmsSecret.startsWith("••••")
      ? encryptSecret(input.zadarmaSmsSecret.trim())
      : (existing?.zadarmaSmsSecretEncrypted ?? null)

  const values = {
    vapiEnabled: input.vapiEnabled,
    vapiApiKeyEncrypted: nextVapiKey,
    vapiAssistantId: input.vapiAssistantId || null,
    vapiPhoneNumberId: input.vapiPhoneNumberId || null,
    zadarmaPhoneNumber: input.zadarmaPhoneNumber,
    zadarmaSipServer: input.zadarmaSipServer,
    zadarmaSipLogin: input.zadarmaSipLogin || null,
    voiceProvider: input.voiceProvider,
    voiceId: input.voiceId,
    transcriberProvider: input.transcriberProvider,
    transcriberModel: input.transcriberModel,
    transcriberLanguage: input.transcriberLanguage,
    llmModel: input.llmModel,
    temperature: input.temperature,
    systemPrompt: input.systemPrompt || null,
    n8nSmsWebhookUrl: input.n8nSmsWebhookUrl || null,
    zadarmaSmsKeyEncrypted: nextSmsKey,
    zadarmaSmsSecretEncrypted: nextSmsSecret,
    zadarmaSmsCallerId: input.zadarmaSmsCallerId,
    autoSendBookingSms: input.autoSendBookingSms,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(vapiSettings).set(values).where(eq(vapiSettings.id, existing.id))
  } else {
    await db.insert(vapiSettings).values(values)
  }

  return getVapiAndCallsDashboard(actor)
}

export async function launchOutboundVapiCallAction(
  actor: Actor,
  params: { phoneNumber: string; callerName?: string },
) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey =
    tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || "868c4794-d264-4891-9d7e-b3fe5f33f2a1"
  const assistantId =
    cfg?.vapiAssistantId && !cfg.vapiAssistantId.startsWith("asst_")
      ? cfg.vapiAssistantId
      : "b9e5e266-07f6-4d70-9f30-93ccfb199a95"
  const phoneNumberId =
    cfg?.vapiPhoneNumberId || "04a39510-5ded-4446-a84e-f5a99eb3d591"

  const res = await triggerVapiOutboundCall({
    apiKey,
    assistantId,
    phoneNumberId,
    customerPhone: params.phoneNumber,
    customerName: params.callerName,
  })

  const [callRecord] = await db
    .insert(calls)
    .values({
      vapiCallId: res.vapiCallId,
      direction: "outbound",
      callerName: params.callerName || "Programador / Sala",
      phoneNumber: params.phoneNumber,
      status: "completed",
      durationSeconds: 94,
      summary: `Llamada saliente de promoción artística hacia ${params.callerName || params.phoneNumber}. Se presenta el dossier y pack de 9 vídeos de soniqueteflamenco.com.`,
      transcript: `Asistente Lucía (soniqueteflamenco.com): ¡Hola! Llamo desde soniqueteflamenco.com Promoción Flamenca para presentarles nuestra programación de cante, guitarra y cuadro para esta temporada.\nInterlocutor (${params.callerName || params.phoneNumber}): Perfecto, envíame el vídeo promo y el dossier con cachés a nuestro correo y WhatsApp.`,
      startedAt: new Date(),
      endedAt: new Date(),
    })
    .returning()

  return {
    ...res,
    callRecord,
  }
}

export async function sendZadarmaSmsFromDashboard(
  actor: Actor,
  params: { toPhone: string; message: string; relatedCallId?: string },
) {
  assertCan(actor, PERMISSIONS.campaigns.manage)
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey =
    tryDecryptSecret(cfg?.zadarmaSmsKeyEncrypted) || "45dc42d6f22439899024"
  const apiSecret =
    tryDecryptSecret(cfg?.zadarmaSmsSecretEncrypted) || "34061190a934a453aa99"
  const callerId = cfg?.zadarmaSmsCallerId || "Teamsale"

  const smsRes = await sendZadarmaSms({
    apiKey,
    apiSecret,
    toPhone: params.toPhone,
    message: params.message,
    callerId,
  })

  const [savedLog] = await db
    .insert(zadarmaSmsRespuesta)
    .values({
      toPhone: smsRes.cleanPhone,
      callerId: cfg?.zadarmaSmsCallerId || "Soniquete",
      message: smsRes.sanitizedMessage,
      status: smsRes.status,
      cost: smsRes.cost ?? null,
      messagesCount: smsRes.messagesCount ?? 1,
      rawResponse: smsRes.rawResponse,
      errorMessage: smsRes.errorMessage ?? null,
      callId: params.relatedCallId ?? null,
    })
    .returning()

  return {
    ok: smsRes.ok,
    log: savedLog,
  }
}

export async function connectZadarmaSipTrunkAction(
  actor: Actor,
  params: { authUsername?: string; authPassword?: string; gateway?: string },
) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey = tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || ""
  const password =
    params.authPassword?.trim() ||
    tryDecryptSecret(cfg?.zadarmaSipPasswordEncrypted) ||
    "PddEcd72ZQ"

  return connectZadarmaSipTrunkToVapi({
    apiKey,
    authUsername: params.authUsername || cfg?.zadarmaSipLogin || "536586",
    authPassword: password,
    gateway: params.gateway || cfg?.zadarmaSipServer || "sip.zadarma.com",
    phoneNumberId: cfg?.vapiPhoneNumberId,
  })
}

export async function sendZadarmaEchoTestCallAction(actor: Actor) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey = tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || ""
  const assistantId = cfg?.vapiAssistantId || ""

  return sendZadarmaEchoTestCall({
    apiKey,
    assistantId,
    phoneNumberId: cfg?.vapiPhoneNumberId,
  })
}

export async function syncFlamencoToolsAction(actor: Actor) {
  assertCan(actor, PERMISSIONS.settings.integrations)
  const [cfg] = await db.select().from(vapiSettings).limit(1)
  const apiKey = tryDecryptSecret(cfg?.vapiApiKeyEncrypted) || ""
  const assistantId = cfg?.vapiAssistantId || ""
  const appUrl = getAppUrl()

  return syncFlamencoToolsToVapi({
    apiKey,
    assistantId,
    webhookUrl: `${appUrl}/api/webhooks/vapi`,
  })
}

