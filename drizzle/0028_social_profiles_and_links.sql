CREATE TABLE IF NOT EXISTS "social_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" varchar(80) NOT NULL,
	"display_name" varchar(140) NOT NULL,
	"bio" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_profiles_handle_unique" ON "social_profiles" ("handle");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profiles_active_idx" ON "social_profiles" ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profiles_created_at_idx" ON "social_profiles" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_profile_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
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
DO $$ BEGIN
 ALTER TABLE "social_profile_links" ADD CONSTRAINT "social_profile_links_profile_id_social_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."social_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profile_links_profile_order_idx" ON "social_profile_links" ("profile_id","order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profile_links_profile_active_idx" ON "social_profile_links" ("profile_id","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profile_links_profile_created_at_idx" ON "social_profile_links" ("profile_id","created_at");
--> statement-breakpoint
INSERT INTO "social_profiles" ("handle", "display_name", "bio", "avatar_url", "is_active")
VALUES (
  'kindjoe',
  'KindJoe',
  'Entertainment, culture, and viral moments in one place.',
  '/brand/logo.svg',
  true
)
ON CONFLICT ("handle") DO NOTHING;
--> statement-breakpoint
INSERT INTO "social_profile_links" (
  "profile_id",
  "label",
  "href",
  "description",
  "order",
  "is_active",
  "is_featured",
  "open_in_new_tab",
  "created_at"
)
SELECT
  p.id,
  kpl.label,
  kpl.href,
  kpl.description,
  kpl."order",
  kpl.is_active,
  kpl.is_featured,
  kpl.open_in_new_tab,
  COALESCE(kpl.created_at, now())
FROM "kindjoe_profile_links" kpl
JOIN "social_profiles" p ON p.handle = 'kindjoe'
WHERE NOT EXISTS (
  SELECT 1
  FROM "social_profile_links" spl
  WHERE spl.profile_id = p.id
);
