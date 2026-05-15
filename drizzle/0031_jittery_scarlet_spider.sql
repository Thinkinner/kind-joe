-- Safe migration: keep legacy jsonb content for compatibility.
-- Add markdown column if missing; do not enforce NOT NULL yet.
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "content_markdown" text;