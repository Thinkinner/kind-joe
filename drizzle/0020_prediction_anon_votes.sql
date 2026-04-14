CREATE TABLE IF NOT EXISTS "prediction_anon_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"voter_key" varchar(190) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_anon_votes" ADD CONSTRAINT "prediction_anon_votes_market_id_prediction_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."prediction_markets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_anon_votes" ADD CONSTRAINT "prediction_anon_votes_option_id_prediction_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."prediction_options"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_anon_votes_market_id_idx" ON "prediction_anon_votes" USING btree ("market_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_anon_votes_option_id_idx" ON "prediction_anon_votes" USING btree ("option_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_anon_votes_voter_key_idx" ON "prediction_anon_votes" USING btree ("voter_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prediction_anon_votes_market_voter_unique" ON "prediction_anon_votes" USING btree ("market_id","voter_key");
