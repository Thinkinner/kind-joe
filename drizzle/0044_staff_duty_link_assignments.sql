CREATE TYPE "public"."link_assignment_status" AS ENUM('assigned', 'done', 'skipped');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_duty_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"duty_date" varchar(10) NOT NULL,
	"working_today" boolean DEFAULT false NOT NULL,
	"working_kind_joe" boolean DEFAULT false NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_duty_checkins_user_date_uq" UNIQUE("user_id","duty_date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_duty_checkins_date_idx" ON "staff_duty_checkins" ("duty_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_duty_checkins_kindjoe_idx" ON "staff_duty_checkins" ("duty_date","working_kind_joe");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_duty_checkins" ADD CONSTRAINT "staff_duty_checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_slack_links" (
	"user_id" text PRIMARY KEY NOT NULL,
	"slack_user_id" varchar(64) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_slack_links_slack_user_uq" ON "staff_slack_links" ("slack_user_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_slack_links" ADD CONSTRAINT "staff_slack_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"slack_channel_id" varchar(64) NOT NULL,
	"slack_message_ts" varchar(64) NOT NULL,
	"posted_by_slack_user_id" varchar(64),
	"assignee_user_id" text NOT NULL,
	"status" "link_assignment_status" DEFAULT 'assigned' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_assignments_msg_url_uq" ON "link_assignments" ("slack_channel_id","slack_message_ts","url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_assignments_assignee_status_idx" ON "link_assignments" ("assignee_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_assignments_assigned_at_idx" ON "link_assignments" ("assigned_at");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_assignments" ADD CONSTRAINT "link_assignments_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
