ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "alias_full_name" text;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "alias_full_name" varchar(120);
