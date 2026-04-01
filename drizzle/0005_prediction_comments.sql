CREATE TABLE "prediction_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" integer,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_comments" ADD CONSTRAINT "prediction_comments_market_id_prediction_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."prediction_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_comments" ADD CONSTRAINT "prediction_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_comments" ADD CONSTRAINT "prediction_comments_parent_id_prediction_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."prediction_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prediction_comments_market_created_idx" ON "prediction_comments" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "prediction_comments_parent_id_idx" ON "prediction_comments" USING btree ("parent_id");