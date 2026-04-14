CREATE TABLE IF NOT EXISTS "social_user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"location" varchar(120),
	"website_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_user_profiles" ADD CONSTRAINT "social_user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_user_profiles_updated_idx" ON "social_user_profiles" USING btree ("updated_at");
