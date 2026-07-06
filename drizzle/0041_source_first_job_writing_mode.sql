ALTER TABLE "source_first_article_jobs"
ADD COLUMN IF NOT EXISTS "writing_mode" varchar(20) DEFAULT 'auto' NOT NULL;
