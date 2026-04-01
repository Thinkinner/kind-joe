CREATE TYPE "public"."prediction_market_status" AS ENUM('open', 'locked', 'resolved');--> statement-breakpoint
CREATE TABLE "prediction_markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"status" "prediction_market_status" DEFAULT 'open' NOT NULL,
	"opens_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locks_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"label" varchar(180) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"voter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_options" ADD CONSTRAINT "prediction_options_market_id_prediction_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."prediction_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_votes" ADD CONSTRAINT "prediction_votes_market_id_prediction_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."prediction_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_votes" ADD CONSTRAINT "prediction_votes_option_id_prediction_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."prediction_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_votes" ADD CONSTRAINT "prediction_votes_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_markets_slug_unique" ON "prediction_markets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "prediction_markets_status_idx" ON "prediction_markets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prediction_markets_opens_at_idx" ON "prediction_markets" USING btree ("opens_at");--> statement-breakpoint
CREATE INDEX "prediction_markets_locks_at_idx" ON "prediction_markets" USING btree ("locks_at");--> statement-breakpoint
CREATE INDEX "prediction_options_market_id_idx" ON "prediction_options" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_options_market_sort_unique" ON "prediction_options" USING btree ("market_id","sort_order");--> statement-breakpoint
CREATE INDEX "prediction_votes_market_id_idx" ON "prediction_votes" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "prediction_votes_option_id_idx" ON "prediction_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "prediction_votes_voter_id_idx" ON "prediction_votes" USING btree ("voter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_votes_market_voter_unique" ON "prediction_votes" USING btree ("market_id","voter_id");