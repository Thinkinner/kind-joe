CREATE TABLE IF NOT EXISTS "kindjoe_profile_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(140) NOT NULL,
	"href" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kindjoe_profile_links_order_idx" ON "kindjoe_profile_links" ("order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kindjoe_profile_links_active_idx" ON "kindjoe_profile_links" ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kindjoe_profile_links_created_at_idx" ON "kindjoe_profile_links" ("created_at");
