ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_type" text DEFAULT 'reader';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "staff_role" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "staff_roles" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "directory_role_mask" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "admin_page_access" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "alias_full_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "force_password_change" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;
