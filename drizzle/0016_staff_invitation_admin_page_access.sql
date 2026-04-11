ALTER TABLE "staff_invitation"
  ADD COLUMN IF NOT EXISTS "admin_page_access" jsonb;
