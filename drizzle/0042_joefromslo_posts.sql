CREATE TABLE IF NOT EXISTS "joefromslo_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"destination_url" text NOT NULL,
	"caption" text,
	"is_pinned" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "joefromslo_posts_feed_idx" ON "joefromslo_posts" ("is_active","is_pinned","order","id");
