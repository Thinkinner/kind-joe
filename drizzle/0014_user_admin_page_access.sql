ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "admin_page_access" jsonb;
