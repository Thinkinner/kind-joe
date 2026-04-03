ALTER TABLE "signals" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "signals" ALTER COLUMN "lng" DROP NOT NULL;
ALTER TABLE "signals" ALTER COLUMN "category" DROP NOT NULL;

ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "enrichment_provider" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "enrichment_model" text;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "enrichment_confidence" double precision;
