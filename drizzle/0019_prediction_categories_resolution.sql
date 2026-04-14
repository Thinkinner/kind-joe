DO $$ BEGIN
 CREATE TYPE "public"."prediction_category" AS ENUM('general', 'politics', 'economy', 'technology', 'science', 'sports', 'world', 'culture');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "prediction_markets" ADD COLUMN IF NOT EXISTS "category" "prediction_category" DEFAULT 'general' NOT NULL;
--> statement-breakpoint
ALTER TABLE "prediction_markets" ADD COLUMN IF NOT EXISTS "winning_option_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_markets" ADD CONSTRAINT "prediction_markets_winning_option_id_prediction_options_id_fk" FOREIGN KEY ("winning_option_id") REFERENCES "public"."prediction_options"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_markets_category_idx" ON "prediction_markets" USING btree ("category");
