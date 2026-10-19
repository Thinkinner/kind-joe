CREATE TABLE IF NOT EXISTS "article_promo_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"video_url" text DEFAULT 'https://www.youtube.com/watch?v=dWnKpsjNLdU' NOT NULL,
	"banner_image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_promo_settings" ADD CONSTRAINT "article_promo_settings_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "article_promo_settings" ("id")
VALUES (1)
ON CONFLICT ("id") DO NOTHING;
