ALTER TABLE "articles"
ADD COLUMN "prediction_id" integer;

ALTER TABLE "articles"
ADD CONSTRAINT "articles_prediction_id_prediction_markets_id_fk"
FOREIGN KEY ("prediction_id")
REFERENCES "public"."prediction_markets"("id")
ON DELETE set null
ON UPDATE no action;

CREATE INDEX "articles_prediction_id_idx" ON "articles" USING btree ("prediction_id");
