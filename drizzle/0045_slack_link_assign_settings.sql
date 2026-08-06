CREATE TABLE IF NOT EXISTS "slack_link_assign_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"channel_id" varchar(64) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slack_link_assign_settings" ADD CONSTRAINT "slack_link_assign_settings_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "slack_link_assign_settings" ("id", "channel_id")
VALUES (1, '')
ON CONFLICT ("id") DO NOTHING;
