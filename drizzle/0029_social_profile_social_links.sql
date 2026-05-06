CREATE TABLE IF NOT EXISTS "social_profile_social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"platform" varchar(40) NOT NULL,
	"label" varchar(80) NOT NULL,
	"href" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"open_in_new_tab" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_profile_social_links" ADD CONSTRAINT "social_profile_social_links_profile_id_social_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."social_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profile_social_links_profile_order_idx" ON "social_profile_social_links" ("profile_id","order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_profile_social_links_profile_active_idx" ON "social_profile_social_links" ("profile_id","is_active");
--> statement-breakpoint
INSERT INTO "social_profile_social_links" ("profile_id", "platform", "label", "href", "order", "is_active", "open_in_new_tab")
SELECT p.id, s.platform, s.label, s.href, s.ordering, true, true
FROM "social_profiles" p
CROSS JOIN (
  VALUES
    ('instagram', 'Instagram', 'https://www.instagram.com', 0),
    ('facebook', 'Facebook', 'https://www.facebook.com', 1),
    ('tiktok', 'TikTok', 'https://www.tiktok.com', 2),
    ('website', 'Website', 'https://kindjoe.com', 3),
    ('email', 'Email', 'mailto:hello@kindjoe.com', 4)
) AS s(platform, label, href, ordering)
WHERE p.handle = 'kindjoe'
  AND NOT EXISTS (
    SELECT 1 FROM "social_profile_social_links" x WHERE x.profile_id = p.id
  );
