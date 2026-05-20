CREATE TABLE "rss_auto_writer_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rss_article_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"article_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rss_auto_writer_queue" ADD CONSTRAINT "rss_auto_writer_queue_rss_article_id_news_rss_articles_id_fk" FOREIGN KEY ("rss_article_id") REFERENCES "public"."news_rss_articles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rss_auto_writer_queue" ADD CONSTRAINT "rss_auto_writer_queue_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "rss_auto_writer_queue_rss_article_unique" ON "rss_auto_writer_queue" USING btree ("rss_article_id");
--> statement-breakpoint
CREATE INDEX "rss_auto_writer_queue_status_idx" ON "rss_auto_writer_queue" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "rss_auto_writer_queue_lock_idx" ON "rss_auto_writer_queue" USING btree ("locked_at");
--> statement-breakpoint
CREATE INDEX "rss_auto_writer_queue_source_url_idx" ON "rss_auto_writer_queue" USING btree ("source_url");
