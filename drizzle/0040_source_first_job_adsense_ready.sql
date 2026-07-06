ALTER TABLE "source_first_article_jobs"
ADD COLUMN IF NOT EXISTS "adsense_ready" boolean DEFAULT false NOT NULL;
