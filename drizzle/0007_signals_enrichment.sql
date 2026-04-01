ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "canonical_source_url" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_display_name" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_handle" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_icon_key" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "trust_tier" text DEFAULT 'medium';
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "trust_score" integer DEFAULT 50;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "media_urls" jsonb DEFAULT '[]'::jsonb;
