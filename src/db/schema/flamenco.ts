// Flamenco Artists Promotion Agency («Soniquete con Arte»), Multimedia Pack (9 .mp4 outputs + covers/thumbnails/flyers),
// Concert Offer Simulator, Web Lead Scraper (Venues & Artists), Artist Digital Services, Cal.com Online Bookings,
// Stripe & Bizum Payments, and VAPI + Zadarma Voice & SMS ([FLA-*], [CAL-*], [PAG-*], [VAP-*]).
import { index, integer, pgTable, text } from "drizzle-orm/pg-core"
import { campaigns } from "./campaigns"
import { bool, EMPTY_JSON_ARRAY, id, json, timestamp, timestamps } from "./columns"
import { contacts } from "./contacts"

export const artists = pgTable(
  "artists",
  {
    id: id(),
    artisticName: text("artistic_name").notNull(),
    legalName: text("legal_name"),
    discipline: text("discipline").notNull().default("cante"),
    biography: text("biography").notNull().default(""),
    styles: json<string[]>("styles").notNull().default(EMPTY_JSON_ARRAY),
    bringsGroup: bool("brings_group").notNull().default(true),
    groupFormation: text("group_formation").notNull().default(""),
    leadGuitarist: text("lead_guitarist"),
    alternateGuitarists: json<string[]>("alternate_guitarists").notNull().default(EMPTY_JSON_ARRAY),
    baseCacheEur: integer("base_cache_eur").notNull().default(1800),
    minCacheEur: integer("min_cache_eur").notNull().default(1200),
    city: text("city").notNull().default("Madrid"),
    phone: text("phone"),
    email: text("email"),
    websiteUrl: text("website_url"),
    instagramHandle: text("instagram_handle"),
    youtubeChannelUrl: text("youtube_channel_url"),
    technicalRider: text("technical_rider"),
    representativeId: text("representative_id"),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    sourceWebExtracted: bool("source_web_extracted").notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("artists_discipline_idx").on(t.discipline)],
).enableRLS()

export const representatives = pgTable(
  "representatives",
  {
    id: id(),
    fullName: text("full_name").notNull(),
    agencyName: text("agency_name"),
    roleKind: text("role_kind").notNull().default("manager"),
    commissionPercent: integer("commission_percent").notNull().default(15),
    phone: text("phone"),
    email: text("email"),
    websiteUrl: text("website_url"),
    city: text("city").notNull().default("Madrid"),
    notes: text("notes"),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("representatives_name_idx").on(t.fullName)],
).enableRLS()

export const venues = pgTable(
  "venues",
  {
    id: id(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("sala_flamenco"),
    city: text("city").notNull().default("Madrid"),
    province: text("province").notNull().default("Madrid"),
    country: text("country").notNull().default("España"),
    address: text("address"),
    capacity: integer("capacity").notNull().default(180),
    typicalBudgetEur: integer("typical_budget_eur").notNull().default(2200),
    programmerName: text("programmer_name"),
    email: text("email"),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    instagramHandle: text("instagram_handle"),
    technicalEquipment: text("technical_equipment"),
    notes: text("notes"),
    sourceWebExtracted: bool("source_web_extracted").notNull().default(false),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("venues_kind_city_idx").on(t.kind, t.city)],
).enableRLS()

export const concerts = pgTable(
  "concerts",
  {
    id: id(),
    title: text("title").notNull(),
    eventKind: text("event_kind").notNull().default("concierto"),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
    representativeId: text("representative_id").references(() => representatives.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at").notNull(),
    dateAndPlaceTbd: bool("date_and_place_tbd").notNull().default(false),
    provisionalBookingsOpen: bool("provisional_bookings_open").notNull().default(false),
    autoNotifyToConfirm: bool("auto_notify_to_confirm").notNull().default(true),
    cancelIfBelowMinAttendees: bool("cancel_if_below_min_attendees").notNull().default(false),
    minAttendees: integer("min_attendees").notNull().default(0),
    currentAttendees: integer("current_attendees").notNull().default(0),
    soundcheckTime: text("soundcheck_time").notNull().default("18:30"),
    doorsTime: text("doors_time").notNull().default("20:30"),
    showTime: text("show_time").notNull().default("21:00"),
    durationMinutes: integer("duration_minutes").notNull().default(80),
    agreedCacheEur: integer("agreed_cache_eur").notNull().default(2200),
    ticketPriceEur: integer("ticket_price_eur").notNull().default(25),
    bringsGroup: bool("brings_group").notNull().default(true),
    guitaristName: text("guitarist_name"),
    lineupDetails: text("lineup_details"),
    status: text("status").notNull().default("propuesta"),
    calcomBookingUid: text("calcom_booking_uid"),
    calcomMeetingUrl: text("calcom_meeting_url"),
    notes: text("notes"),
    serviceId: text("service_id"),
    tentativeDateText: text("tentative_date_text"),
    sinpreciodefinitivo: bool("sinpreciodefinitivo").notNull().default(false),
    textosinpreciodefinitivo: text("textosinpreciodefinitivo"),
    textoespecifico: text("textoespecifico"),
    flyerUrl: text("flyer_url"),
    flyerParticularUrl: text("flyer_particular_url"),
    videoUrl: text("video_url"),
    videoParticularUrl: text("video_particular_url"),
    ...timestamps(),
  },
  (t) => [
    index("concerts_artist_idx").on(t.artistId),
    index("concerts_venue_idx").on(t.venueId),
    index("concerts_starts_at_idx").on(t.startsAt),
  ],
).enableRLS()

export const eventProvisionalBookings = pgTable(
  "event_provisional_bookings",
  {
    id: id(),
    concertId: text("concert_id")
      .notNull()
      .references(() => concerts.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email"),
    attendeePhone: text("attendee_phone"),
    seats: integer("seats").notNull().default(1),
    status: text("status").notNull().default("provisional"),
    confirmationNoticeSentAt: timestamp("confirmation_notice_sent_at"),
    confirmedAt: timestamp("confirmed_at"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("event_prov_bookings_concert_idx").on(t.concertId)],
).enableRLS()

export const contracts = pgTable(
  "contracts",
  {
    id: id(),
    code: text("code").notNull(),
    concertId: text("concert_id").references(() => concerts.id, { onDelete: "set null" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
    representativeId: text("representative_id").references(() => representatives.id, {
      onDelete: "set null",
    }),
    contractType: text("contract_type").notNull().default("actuacion_directa"),
    status: text("status").notNull().default("borrador"),
    totalAmountEur: integer("total_amount_eur").notNull().default(2200),
    advancePercent: integer("advance_percent").notNull().default(50),
    agencyCommissionPercent: integer("agency_commission_percent").notNull().default(15),
    stripePaymentLinkUrl: text("stripe_payment_link_url"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    clausesSummary: text("clauses_summary"),
    ...timestamps(),
  },
  (t) => [index("contracts_status_idx").on(t.status)],
).enableRLS()

export const flamencoMediaAssets = pgTable(
  "flamenco_media_assets",
  {
    id: id(),
    artistId: text("artist_id").references(() => artists.id, { onDelete: "cascade" }),
    concertId: text("concert_id").references(() => concerts.id, { onDelete: "cascade" }),
    pieceCode: text("piece_code").notNull(),
    customPieceLabel: text("custom_piece_label"),
    sourcePlatform: text("source_platform").notNull().default("plataforma"),
    youtubeVideoId: text("youtube_video_id"),
    title: text("title").notNull(),
    formatLabel: text("format_label").notNull().default("16:9 · MP4"),
    durationSeconds: integer("duration_seconds"),
    maxSizeMb: integer("max_size_mb"),
    dimensions: text("dimensions").notNull().default("1920x1080"),
    recommendedUse: text("recommended_use").notNull().default(""),
    fileUrl: text("file_url").notNull().default(""),
    thumbnailUrl: text("thumbnail_url"),
    releasePhase: text("release_phase").notNull().default("referencia_web"),
    key: text("key"),
    physicalPath: text("physical_path"),
    serviceId: text("service_id"),
    ...timestamps(),
  },
  (t) => [
    index("flamenco_media_artist_idx").on(t.artistId),
    index("flamenco_media_concert_idx").on(t.concertId),
  ],
).enableRLS()

export const concertOffers = pgTable(
  "concert_offers",
  {
    id: id(),
    title: text("title").notNull(),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
    concertId: text("concert_id").references(() => concerts.id, { onDelete: "set null" }),
    targetVenueKind: text("target_venue_kind").notNull().default("sala_flamenco"),
    proposedDateText: text("proposed_date_text").notNull().default(""),
    proposedCacheEur: integer("proposed_cache_eur").notNull().default(2000),
    includesGroup: bool("includes_group").notNull().default(true),
    guitaristName: text("guitarist_name"),
    selectedMediaPieces: json<string[]>("selected_media_pieces").notNull().default(EMPTY_JSON_ARRAY),
    channels: json<string[]>("channels").notNull().default(EMPTY_JSON_ARRAY),
    whatsappPreview: text("whatsapp_preview").notNull().default(""),
    telegramPreview: text("telegram_preview").notNull().default(""),
    emailSubject: text("email_subject").notNull().default(""),
    emailPreview: text("email_preview").notNull().default(""),
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    status: text("status").notNull().default("simulada"),
    ...timestamps(),
  },
  (t) => [index("concert_offers_artist_idx").on(t.artistId)],
).enableRLS()

export const artistDigitalServices = pgTable(
  "artist_digital_services",
  {
    id: id(),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    packName: text("pack_name").notNull(),
    status: text("status").notNull().default("en_produccion"),
    includesLanding: bool("includes_landing").notNull().default(true),
    landingDomain: text("landing_domain"),
    includesAiAgent: bool("includes_ai_agent").notNull().default(true),
    includesWhatsappChannel: bool("includes_whatsapp_channel").notNull().default(true),
    includesTelegramBot: bool("includes_telegram_bot").notNull().default(true),
    telegramBotUsername: text("telegram_bot_username"),
    includesInstagramSetup: bool("includes_instagram_setup").notNull().default(true),
    includesYoutubeChannel: bool("includes_youtube_channel").notNull().default(true),
    includesNineVideosPack: bool("includes_nine_videos_pack").notNull().default(true),
    setupFeeEur: integer("setup_fee_eur").notNull().default(950),
    monthlyFeeEur: integer("monthly_fee_eur").notNull().default(190),
    stripePaymentLinkUrl: text("stripe_payment_link_url"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("artist_digital_services_artist_idx").on(t.artistId)],
).enableRLS()

export const calcomSettings = pgTable("calcom_settings", {
  id: id(),
  enabled: bool("enabled").notNull().default(true),
  apiKeyEncrypted: text("api_key_encrypted"),
  baseUrl: text("base_url").notNull().default("https://api.cal.com/v2"),
  defaultEventTypeId: text("default_event_type_id").default("123456"),
  autoSyncBookings: bool("auto_sync_bookings").notNull().default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestStatus: text("last_test_status").default("ok"),
  ...timestamps(),
}).enableRLS()

export const paymentSettings = pgTable("payment_settings", {
  id: id(),
  stripeEnabled: bool("stripe_enabled").notNull().default(true),
  publishableKey: text("publishable_key"),
  secretKeyEncrypted: text("secret_key_encrypted"),
  webhookSecretEncrypted: text("webhook_secret_encrypted"),
  enableCardAndWallets: bool("enable_card_and_wallets").notNull().default(true),
  enableBizum: bool("enable_bizum").notNull().default(true),
  currency: text("currency").notNull().default("EUR"),
  ...timestamps(),
}).enableRLS()

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: id(),
    concept: text("concept").notNull(),
    payerName: text("payer_name").notNull(),
    payerEmail: text("payer_email"),
    payerPhone: text("payer_phone"),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    status: text("status").notNull().default("pending"),
    method: text("method").notNull().default("stripe"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripePaymentUrl: text("stripe_payment_url"),
    contractId: text("contract_id").references(() => contracts.id, { onDelete: "set null" }),
    concertId: text("concert_id").references(() => concerts.id, { onDelete: "set null" }),
    artistServiceId: text("artist_service_id").references(() => artistDigitalServices.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("payment_records_status_idx").on(t.status)],
).enableRLS()

export const vapiSettings = pgTable("vapi_settings", {
  id: id(),
  vapiEnabled: bool("vapi_enabled").notNull().default(true),
  vapiApiKeyEncrypted: text("vapi_api_key_encrypted"),
  vapiAssistantId: text("vapi_assistant_id").default("asst_soniquete_flamenco_madrid"),
  vapiPhoneNumberId: text("vapi_phone_number_id").default("ph_zadarma_sip_madrid"),
  zadarmaPhoneNumber: text("zadarma_phone_number").notNull().default("+34919933764"),
  zadarmaSipServer: text("zadarma_sip_server").notNull().default("sip.zadarma.com"),
  zadarmaSipLogin: text("zadarma_sip_login").default("536586"),
  zadarmaSipPasswordEncrypted: text("zadarma_sip_password_encrypted"),
  voiceProvider: text("voice_provider").notNull().default("11labs"),
  voiceId: text("voice_id").notNull().default("791d5162-d5eb-40f0-8189-f19db44611d8"),
  transcriberProvider: text("transcriber_provider").notNull().default("deepgram"),
  transcriberModel: text("transcriber_model").notNull().default("nova-3-general"),
  transcriberLanguage: text("transcriber_language").notNull().default("es"),
  llmModel: text("llm_model").notNull().default("gpt-4o-mini"),
  temperature: text("temperature").notNull().default("0.3"),
  systemPrompt: text("system_prompt"),
  n8nSmsWebhookUrl: text("n8n_sms_webhook_url"),
  zadarmaSmsKeyEncrypted: text("zadarma_sms_key_encrypted"),
  zadarmaSmsSecretEncrypted: text("zadarma_sms_secret_encrypted"),
  zadarmaSmsCallerId: text("zadarma_sms_caller_id").notNull().default("+34919933764"),
  autoSendBookingSms: bool("auto_send_booking_sms").notNull().default(true),
  whatsappProvider: text("whatsapp_provider").notNull().default("evolution"),
  whatsappNumber: text("whatsapp_number").notNull().default("+34648212650"),
  evolutionApiUrl: text("evolution_api_url").default("https://evolution.soniqueteconarte.jigretera.com"),
  evolutionInstanceName: text("evolution_instance_name").default("soniquete_flamenco"),
  evolutionApiKeyEncrypted: text("evolution_api_key_encrypted"),
  evolutionWebhookSecretEncrypted: text("evolution_webhook_secret_encrypted"),
  ycloudApiKeyEncrypted: text("ycloud_api_key_encrypted"),
  ycloudWebhookSecretEncrypted: text("ycloud_webhook_secret_encrypted"),
  metaPhoneNumberId: text("meta_phone_number_id"),
  metaWabaId: text("meta_waba_id"),
  metaAccessTokenEncrypted: text("meta_access_token_encrypted"),
  emailAutoBookingEnabled: bool("email_auto_booking_enabled").notNull().default(true),
  ...timestamps(),
}).enableRLS()

export const calls = pgTable(
  "calls",
  {
    id: id(),
    vapiCallId: text("vapi_call_id").notNull(),
    direction: text("direction").notNull().default("inbound"),
    callerName: text("caller_name"),
    phoneNumber: text("phone_number").notNull(),
    status: text("status").notNull().default("completed"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    needsReview: bool("needs_review").notNull().default(false),
    isConsulted: bool("is_consulted").notNull().default(false),
    summary: text("summary").notNull().default(""),
    transcript: text("transcript").notNull().default(""),
    recordingUrl: text("recording_url"),
    relatedArtistId: text("related_artist_id").references(() => artists.id, {
      onDelete: "set null",
    }),
    relatedVenueId: text("related_venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    relatedConcertId: text("related_concert_id").references(() => concerts.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at")
      .notNull()
      .$defaultFn(() => new Date()),
    endedAt: timestamp("ended_at"),
    ...timestamps(),
  },
  (t) => [index("calls_vapi_call_id_idx").on(t.vapiCallId)],
).enableRLS()

export const zadarmaSmsRespuesta = pgTable(
  "zadarma_sms_respuesta",
  {
    id: id(),
    toPhone: text("to_phone").notNull(),
    callerId: text("caller_id").default("Soniquete"),
    message: text("message").notNull(),
    status: text("status").notNull().default("success"),
    cost: text("cost"),
    messagesCount: integer("messages_count").notNull().default(1),
    rawResponse: text("raw_response").notNull().default("{}"),
    errorMessage: text("error_message"),
    callId: text("call_id").references(() => calls.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("zadarma_sms_to_phone_idx").on(t.toPhone)],
).enableRLS()
