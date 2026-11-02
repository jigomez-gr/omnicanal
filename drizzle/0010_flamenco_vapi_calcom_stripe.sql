CREATE TABLE "artists" (
	"id" text PRIMARY KEY NOT NULL,
	"artistic_name" text NOT NULL,
	"legal_name" text,
	"discipline" text DEFAULT 'cante' NOT NULL,
	"biography" text DEFAULT '' NOT NULL,
	"styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brings_group" boolean DEFAULT true NOT NULL,
	"group_formation" text DEFAULT '' NOT NULL,
	"lead_guitarist" text,
	"alternate_guitarists" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_cache_eur" integer DEFAULT 1800 NOT NULL,
	"min_cache_eur" integer DEFAULT 1200 NOT NULL,
	"city" text DEFAULT 'Madrid' NOT NULL,
	"phone" text,
	"email" text,
	"website_url" text,
	"instagram_handle" text,
	"youtube_channel_url" text,
	"technical_rider" text,
	"representative_id" text,
	"contact_id" text,
	"source_web_extracted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"agency_name" text,
	"role_kind" text DEFAULT 'manager' NOT NULL,
	"commission_percent" integer DEFAULT 15 NOT NULL,
	"phone" text,
	"email" text,
	"website_url" text,
	"city" text DEFAULT 'Madrid' NOT NULL,
	"notes" text,
	"contact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "representatives" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'sala_flamenco' NOT NULL,
	"city" text DEFAULT 'Madrid' NOT NULL,
	"province" text DEFAULT 'Madrid' NOT NULL,
	"country" text DEFAULT 'España' NOT NULL,
	"address" text,
	"capacity" integer DEFAULT 180 NOT NULL,
	"typical_budget_eur" integer DEFAULT 2200 NOT NULL,
	"programmer_name" text,
	"email" text,
	"phone" text,
	"website_url" text,
	"instagram_handle" text,
	"technical_equipment" text,
	"notes" text,
	"source_web_extracted" boolean DEFAULT false NOT NULL,
	"contact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "concerts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"event_kind" text DEFAULT 'concierto' NOT NULL,
	"artist_id" text NOT NULL,
	"venue_id" text,
	"representative_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"date_and_place_tbd" boolean DEFAULT false NOT NULL,
	"provisional_bookings_open" boolean DEFAULT false NOT NULL,
	"auto_notify_to_confirm" boolean DEFAULT true NOT NULL,
	"cancel_if_below_min_attendees" boolean DEFAULT false NOT NULL,
	"min_attendees" integer DEFAULT 0 NOT NULL,
	"current_attendees" integer DEFAULT 0 NOT NULL,
	"soundcheck_time" text DEFAULT '18:30' NOT NULL,
	"doors_time" text DEFAULT '20:30' NOT NULL,
	"show_time" text DEFAULT '21:00' NOT NULL,
	"duration_minutes" integer DEFAULT 80 NOT NULL,
	"agreed_cache_eur" integer DEFAULT 2200 NOT NULL,
	"ticket_price_eur" integer DEFAULT 25 NOT NULL,
	"brings_group" boolean DEFAULT true NOT NULL,
	"guitarist_name" text,
	"lineup_details" text,
	"status" text DEFAULT 'propuesta' NOT NULL,
	"calcom_booking_uid" text,
	"calcom_meeting_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concerts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "event_provisional_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"concert_id" text NOT NULL,
	"contact_id" text,
	"attendee_name" text NOT NULL,
	"attendee_email" text,
	"attendee_phone" text,
	"seats" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'provisional' NOT NULL,
	"confirmation_notice_sent_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_provisional_bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"concert_id" text,
	"artist_id" text NOT NULL,
	"venue_id" text,
	"representative_id" text,
	"contract_type" text DEFAULT 'actuacion_directa' NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"total_amount_eur" integer DEFAULT 2200 NOT NULL,
	"advance_percent" integer DEFAULT 50 NOT NULL,
	"agency_commission_percent" integer DEFAULT 15 NOT NULL,
	"stripe_payment_link_url" text,
	"stripe_checkout_session_id" text,
	"clauses_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "flamenco_media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text,
	"concert_id" text,
	"piece_code" text NOT NULL,
	"custom_piece_label" text,
	"source_platform" text DEFAULT 'plataforma' NOT NULL,
	"youtube_video_id" text,
	"title" text NOT NULL,
	"format_label" text DEFAULT '16:9 · MP4' NOT NULL,
	"duration_seconds" integer,
	"max_size_mb" integer,
	"dimensions" text DEFAULT '1920x1080' NOT NULL,
	"recommended_use" text DEFAULT '' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"thumbnail_url" text,
	"release_phase" text DEFAULT 'referencia_web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "concert_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist_id" text NOT NULL,
	"venue_id" text,
	"concert_id" text,
	"target_venue_kind" text DEFAULT 'sala_flamenco' NOT NULL,
	"proposed_date_text" text DEFAULT '' NOT NULL,
	"proposed_cache_eur" integer DEFAULT 2000 NOT NULL,
	"includes_group" boolean DEFAULT true NOT NULL,
	"guitarist_name" text,
	"selected_media_pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"whatsapp_preview" text DEFAULT '' NOT NULL,
	"telegram_preview" text DEFAULT '' NOT NULL,
	"email_subject" text DEFAULT '' NOT NULL,
	"email_preview" text DEFAULT '' NOT NULL,
	"campaign_id" text,
	"status" text DEFAULT 'simulada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concert_offers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "artist_digital_services" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"pack_name" text NOT NULL,
	"status" text DEFAULT 'en_produccion' NOT NULL,
	"includes_landing" boolean DEFAULT true NOT NULL,
	"landing_domain" text,
	"includes_ai_agent" boolean DEFAULT true NOT NULL,
	"includes_whatsapp_channel" boolean DEFAULT true NOT NULL,
	"includes_telegram_bot" boolean DEFAULT true NOT NULL,
	"telegram_bot_username" text,
	"includes_instagram_setup" boolean DEFAULT true NOT NULL,
	"includes_youtube_channel" boolean DEFAULT true NOT NULL,
	"includes_nine_videos_pack" boolean DEFAULT true NOT NULL,
	"setup_fee_eur" integer DEFAULT 950 NOT NULL,
	"monthly_fee_eur" integer DEFAULT 190 NOT NULL,
	"stripe_payment_link_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_digital_services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "calcom_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"api_key_encrypted" text,
	"base_url" text DEFAULT 'https://api.cal.com/v2' NOT NULL,
	"default_event_type_id" text DEFAULT '123456',
	"auto_sync_bookings" boolean DEFAULT true NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_status" text DEFAULT 'ok',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calcom_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_enabled" boolean DEFAULT true NOT NULL,
	"publishable_key" text,
	"secret_key_encrypted" text,
	"webhook_secret_encrypted" text,
	"enable_card_and_wallets" boolean DEFAULT true NOT NULL,
	"enable_bizum" boolean DEFAULT true NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" text PRIMARY KEY NOT NULL,
	"concept" text NOT NULL,
	"payer_name" text NOT NULL,
	"payer_email" text,
	"payer_phone" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text DEFAULT 'stripe' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_payment_url" text,
	"contract_id" text,
	"concert_id" text,
	"artist_service_id" text,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "vapi_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"vapi_enabled" boolean DEFAULT true NOT NULL,
	"vapi_api_key_encrypted" text,
	"vapi_assistant_id" text DEFAULT 'asst_soniquete_flamenco_madrid',
	"vapi_phone_number_id" text DEFAULT 'ph_zadarma_sip_madrid',
	"zadarma_phone_number" text DEFAULT '+34919931525' NOT NULL,
	"zadarma_sip_server" text DEFAULT 'sip.zadarma.com' NOT NULL,
	"zadarma_sip_login" text DEFAULT '633610',
	"voice_provider" text DEFAULT '11labs' NOT NULL,
	"voice_id" text DEFAULT '791d5162-d5eb-40f0-8189-f19db44611d8' NOT NULL,
	"transcriber_provider" text DEFAULT 'deepgram' NOT NULL,
	"transcriber_model" text DEFAULT 'nova-2' NOT NULL,
	"transcriber_language" text DEFAULT 'es' NOT NULL,
	"llm_model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"temperature" text DEFAULT '0.3' NOT NULL,
	"system_prompt" text,
	"n8n_sms_webhook_url" text,
	"zadarma_sms_key_encrypted" text,
	"zadarma_sms_secret_encrypted" text,
	"zadarma_sms_caller_id" text DEFAULT 'Soniquete' NOT NULL,
	"auto_send_booking_sms" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vapi_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" text PRIMARY KEY NOT NULL,
	"vapi_call_id" text NOT NULL,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"caller_name" text,
	"phone_number" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"transcript" text DEFAULT '' NOT NULL,
	"recording_url" text,
	"related_artist_id" text,
	"related_venue_id" text,
	"related_concert_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "zadarma_sms_respuesta" (
	"id" text PRIMARY KEY NOT NULL,
	"to_phone" text NOT NULL,
	"caller_id" text DEFAULT 'Soniquete',
	"message" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"cost" text,
	"messages_count" integer DEFAULT 1 NOT NULL,
	"raw_response" text DEFAULT '{}' NOT NULL,
	"error_message" text,
	"call_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zadarma_sms_respuesta" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_provisional_bookings" ADD CONSTRAINT "event_prov_bookings_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_provisional_bookings" ADD CONSTRAINT "event_prov_bookings_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "event_prov_bookings_concert_idx" ON "event_provisional_bookings" USING btree ("concert_id");
--> statement-breakpoint
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ADD CONSTRAINT "flamenco_media_assets_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ADD CONSTRAINT "flamenco_media_assets_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concert_offers" ADD CONSTRAINT "concert_offers_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concert_offers" ADD CONSTRAINT "concert_offers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concert_offers" ADD CONSTRAINT "concert_offers_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concert_offers" ADD CONSTRAINT "concert_offers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "artist_digital_services" ADD CONSTRAINT "artist_digital_services_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_artist_service_id_artist_digital_services_id_fk" FOREIGN KEY ("artist_service_id") REFERENCES "public"."artist_digital_services"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_related_artist_id_artists_id_fk" FOREIGN KEY ("related_artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_related_venue_id_venues_id_fk" FOREIGN KEY ("related_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_related_concert_id_concerts_id_fk" FOREIGN KEY ("related_concert_id") REFERENCES "public"."concerts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "zadarma_sms_respuesta" ADD CONSTRAINT "zadarma_sms_respuesta_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "artists_discipline_idx" ON "artists" USING btree ("discipline");
--> statement-breakpoint
CREATE INDEX "representatives_name_idx" ON "representatives" USING btree ("full_name");
--> statement-breakpoint
CREATE INDEX "venues_kind_city_idx" ON "venues" USING btree ("kind","city");
--> statement-breakpoint
CREATE INDEX "concerts_artist_idx" ON "concerts" USING btree ("artist_id");
--> statement-breakpoint
CREATE INDEX "concerts_venue_idx" ON "concerts" USING btree ("venue_id");
--> statement-breakpoint
CREATE INDEX "concerts_starts_at_idx" ON "concerts" USING btree ("starts_at");
--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "flamenco_media_artist_idx" ON "flamenco_media_assets" USING btree ("artist_id");
--> statement-breakpoint
CREATE INDEX "flamenco_media_concert_idx" ON "flamenco_media_assets" USING btree ("concert_id");
--> statement-breakpoint
CREATE INDEX "concert_offers_artist_idx" ON "concert_offers" USING btree ("artist_id");
--> statement-breakpoint
CREATE INDEX "artist_digital_services_artist_idx" ON "artist_digital_services" USING btree ("artist_id");
--> statement-breakpoint
CREATE INDEX "payment_records_status_idx" ON "payment_records" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "calls_vapi_call_id_idx" ON "calls" USING btree ("vapi_call_id");
--> statement-breakpoint
CREATE INDEX "zadarma_sms_to_phone_idx" ON "zadarma_sms_respuesta" USING btree ("to_phone");
