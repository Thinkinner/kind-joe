CREATE TABLE IF NOT EXISTS "source_first_article_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_first_article_jobs" ADD CONSTRAINT "source_first_article_jobs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_first_article_jobs_status_idx" ON "source_first_article_jobs" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_first_article_jobs_lock_idx" ON "source_first_article_jobs" USING btree ("locked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_first_article_jobs_created_by_idx" ON "source_first_article_jobs" USING btree ("created_by");
