CREATE TABLE "prediction_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_likes" ADD CONSTRAINT "prediction_likes_market_id_prediction_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."prediction_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_likes" ADD CONSTRAINT "prediction_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prediction_likes_market_id_idx" ON "prediction_likes" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "prediction_likes_user_id_idx" ON "prediction_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_likes_market_user_unique" ON "prediction_likes" USING btree ("market_id","user_id");