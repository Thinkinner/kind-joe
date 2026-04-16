ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "force_password_change" boolean NOT NULL DEFAULT false;
