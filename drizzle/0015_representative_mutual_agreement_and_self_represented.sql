ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "representative_agreed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "self_represented" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "representation_notice_sent_at" timestamp with time zone;
