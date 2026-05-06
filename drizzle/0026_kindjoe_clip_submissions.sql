CREATE TABLE IF NOT EXISTS "kindjoe_clip_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"age_group" varchar(20) NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"clip_url" text NOT NULL,
	"filmed_location" text NOT NULL,
	"has_description" boolean DEFAULT false NOT NULL,
	"clip_description" text,
	"recorded_by_submitter" boolean NOT NULL,
	"wants_clip_credit" boolean DEFAULT false NOT NULL,
	"paypal_email" varchar(255),
	"digital_signature" varchar(255) NOT NULL,
	"accepts_submission_terms" boolean NOT NULL,
	"confirms_no_exclusive_agreement" boolean NOT NULL,
	"confirms_clip_guidelines" boolean NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kindjoe_clip_submissions_created_at_idx" ON "kindjoe_clip_submissions" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kindjoe_clip_submissions_email_idx" ON "kindjoe_clip_submissions" ("email");
