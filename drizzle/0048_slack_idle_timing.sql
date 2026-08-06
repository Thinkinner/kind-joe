ALTER TABLE "slack_link_assign_settings" ADD COLUMN IF NOT EXISTS "idle_after_seconds" integer DEFAULT 7200 NOT NULL;
--> statement-breakpoint
ALTER TABLE "slack_link_assign_settings" ADD COLUMN IF NOT EXISTS "idle_cooldown_seconds" integer DEFAULT 7200 NOT NULL;
