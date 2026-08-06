ALTER TABLE "staff_duty_checkins" ADD COLUMN IF NOT EXISTS "last_content_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "staff_duty_checkins" ADD COLUMN IF NOT EXISTS "last_nudge_at" timestamp with time zone;
