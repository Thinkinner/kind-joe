ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "geographic_scope" text DEFAULT 'global';
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "admin_area" text;
--> statement-breakpoint
UPDATE "signals" SET "geographic_scope" = 'global' WHERE "geographic_scope" IS NULL;
--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "geographic_scope" SET NOT NULL;
