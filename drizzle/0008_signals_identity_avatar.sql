ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_avatar_url" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_verified" boolean DEFAULT false;
