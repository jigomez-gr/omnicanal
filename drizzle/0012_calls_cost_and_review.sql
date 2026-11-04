ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "cost_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "needs_review" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "is_consulted" boolean DEFAULT false NOT NULL;
