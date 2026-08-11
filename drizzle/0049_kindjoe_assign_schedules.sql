CREATE TABLE IF NOT EXISTS "kindjoe_assign_schedules" (
  "user_id" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "mon_weight" integer DEFAULT 0 NOT NULL,
  "tue_weight" integer DEFAULT 0 NOT NULL,
  "wed_weight" integer DEFAULT 0 NOT NULL,
  "thu_weight" integer DEFAULT 0 NOT NULL,
  "fri_weight" integer DEFAULT 0 NOT NULL,
  "sat_weight" integer DEFAULT 0 NOT NULL,
  "sun_weight" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_user_id" text
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kindjoe_assign_schedules"
    ADD CONSTRAINT "kindjoe_assign_schedules_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kindjoe_assign_schedules"
    ADD CONSTRAINT "kindjoe_assign_schedules_updated_by_user_id_user_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
