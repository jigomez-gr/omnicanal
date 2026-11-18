ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "calendar_id" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "min_quorum" integer;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "quorum_deadline" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "event_start_date" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "event_end_date" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_whatsapp" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_email" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_voice" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_sms" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_hours_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_hours" integer DEFAULT 24 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_minutes_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reminder_minutes" integer DEFAULT 120 NOT NULL;
