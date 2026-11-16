ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "imagenprincipal" text;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "mime_type" text DEFAULT '.jpg';
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "patreal" text;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "instagram_url" text;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "facebook_url" text;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "telegram_url" text;
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "tiktok_url" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_web_media_details" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"path" text DEFAULT '' NOT NULL,
	"tipo_mime" text DEFAULT '.jpg' NOT NULL,
	"pertenece_pack" boolean DEFAULT false NOT NULL,
	"texto_mostrar" text DEFAULT '' NOT NULL,
	"tooltip" text DEFAULT '' NOT NULL,
	"visible_web" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "artist_web_media_details_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_web_media_artist_idx" ON "artist_web_media_details" USING btree ("artist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_web_media_visible_idx" ON "artist_web_media_details" USING btree ("visible_web");
--> statement-breakpoint
ALTER TABLE "artist_web_media_details" ENABLE ROW LEVEL SECURITY;
