ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "service_type" text DEFAULT 'recurring' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "event_dates_text" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "schedule_text" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "weekly_schedule" jsonb;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "flyer_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "flyer_path" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "flyer_particular_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "flyer_particular_path" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "video_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "video_path" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "video_particular_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "video_particular_path" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "textoespecifico" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "fecha_desde" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "fecha_hasta" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sinfechadefinitiva" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "textosinfechadefinitiva" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sinpreciodefinitivo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "textosinpreciodefinitivo" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "payment_type" text DEFAULT 'in_person' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "external_payment_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "allowed_modalities" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "requires_reason" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "cal_event_type_id" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_notes" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notify_by_email" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notify_by_whatsapp" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notify_by_sms" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notify_by_telegram" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "artist_id" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "venue_id" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "concert_id" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "service_id" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "tentative_date_text" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "sinpreciodefinitivo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "textosinpreciodefinitivo" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "textoespecifico" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "flyer_url" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "flyer_particular_url" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "video_url" text;
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "video_particular_url" text;
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ADD COLUMN IF NOT EXISTS "key" text;
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ADD COLUMN IF NOT EXISTS "physical_path" text;
--> statement-breakpoint
ALTER TABLE "flamenco_media_assets" ADD COLUMN IF NOT EXISTS "service_id" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "whatsapp_provider" text DEFAULT 'evolution' NOT NULL;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "whatsapp_number" text DEFAULT '+34648212650' NOT NULL;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "evolution_api_url" text DEFAULT 'https://evolution.soniqueteconarte.jigretera.com';
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "evolution_instance_name" text DEFAULT 'soniquete_flamenco';
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "evolution_api_key_encrypted" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "evolution_webhook_secret_encrypted" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "ycloud_api_key_encrypted" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "ycloud_webhook_secret_encrypted" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "meta_phone_number_id" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "meta_waba_id" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "meta_access_token_encrypted" text;
--> statement-breakpoint
ALTER TABLE "vapi_settings" ADD COLUMN IF NOT EXISTS "email_auto_booking_enabled" boolean DEFAULT true NOT NULL;
