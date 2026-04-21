CREATE TABLE "article_embeddings" (
  "article_id" varchar(50) PRIMARY KEY NOT NULL,
  "model" varchar(120) NOT NULL,
  "embedding" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_text" text NOT NULL,
  "source_text_hash" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_embeddings"
ADD CONSTRAINT "article_embeddings_article_id_articles_id_fk"
FOREIGN KEY ("article_id")
REFERENCES "public"."articles"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "article_embeddings_model_idx" ON "article_embeddings" USING btree ("model");
--> statement-breakpoint
CREATE INDEX "article_embeddings_source_hash_idx" ON "article_embeddings" USING btree ("source_text_hash");
--> statement-breakpoint
CREATE INDEX "article_embeddings_updated_at_idx" ON "article_embeddings" USING btree ("updated_at");
