-- Idempotent baseline: safe to run on existing DBs (shared with newsletter CMS).
-- Enums
DO $$ BEGIN
 CREATE TYPE "public"."block_type" AS ENUM('heading', 'paragraph', 'image', 'quote', 'list', 'embed', 'code', 'hr');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('Admin', 'Writer', 'Editor');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_automation_rss_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_rss_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"last_fetched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"modified_title" text,
	"link" text NOT NULL,
	"image_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"content_snippet" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ai_processed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"rss_item_id" integer,
	"status" varchar(40) DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"avatar_url" text,
	"role" "role" DEFAULT 'Writer' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"excerpt" text,
	"cover_image_url" text,
	"category" varchar(50) DEFAULT 'General',
	"author_id" varchar(128) NOT NULL,
	"seo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"publish_at" timestamp with time zone,
	"published_by" varchar(128),
	"deleted_at" timestamp with time zone,
	"reading_minutes" integer,
	"is_draft" boolean DEFAULT true NOT NULL,
	"content" jsonb NOT NULL,
	"content_html" text,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_categories" (
	"article_id" varchar(50) NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "article_categories_article_id_category_id_pk" PRIMARY KEY("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_tags" (
	"article_id" varchar(50) NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_pageviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" varchar(50) NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"referrer" text,
	"traffic_source" varchar(100),
	"visitor_id" varchar(128),
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rss_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"default_category_slug" varchar(120),
	"default_tags" jsonb,
	"last_fetched_at" timestamp with time zone,
	CONSTRAINT "rss_sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rss_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"guid" text NOT NULL,
	"link" text NOT NULL,
	"title" text,
	"author" text,
	"published_at" timestamp with time zone,
	"raw" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"article_id" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
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
CREATE TABLE IF NOT EXISTS "clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"clicked_at" timestamp DEFAULT now(),
	"device" text,
	"referrer" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'draft',
	"data" jsonb NOT NULL,
	"articles" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_rss_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"modified_title" text,
	"link" text NOT NULL,
	"image_url" text,
	"content_snippet" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ai_processed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_url" text DEFAULT '',
	"author_id" text DEFAULT '',
	"cloudinary_cloud_name" text DEFAULT '',
	"cloudinary_api_key" text DEFAULT '',
	"cloudinary_api_secret" text DEFAULT '',
	"cloudinary_upload_preset" text DEFAULT '',
	"ghl_api_key" text DEFAULT '',
	"ghl_location_id" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"headline" text NOT NULL,
	"summary" text,
	"source" text NOT NULL,
	"source_url" text,
	"category" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"city" text,
	"country" text,
	"geographic_scope" text DEFAULT 'global' NOT NULL,
	"admin_area" text,
	"impact_score" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_news_articles" ADD CONSTRAINT "ai_news_articles_source_id_news_rss_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."news_rss_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_rss_item_id_rss_items_id_fk" FOREIGN KEY ("rss_item_id") REFERENCES "public"."rss_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_pageviews" ADD CONSTRAINT "article_pageviews_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clicks" ADD CONSTRAINT "clicks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news_rss_articles" ADD CONSTRAINT "news_rss_articles_source_id_news_rss_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."news_rss_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rss_items" ADD CONSTRAINT "rss_items_source_id_rss_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."rss_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_news_articles_link_unique" ON "ai_news_articles" USING btree ("link");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pageviews_article_id_idx" ON "article_pageviews" USING btree ("article_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pageviews_traffic_source_idx" ON "article_pageviews" USING btree ("traffic_source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pageviews_viewed_at_idx" ON "article_pageviews" USING btree ("viewed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_slug_idx" ON "articles" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_published_idx" ON "articles" USING btree ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_list_idx" ON "articles" USING btree ("is_draft","published_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_rss_articles_link_unique" ON "news_rss_articles" USING btree ("link");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_rss_sources_url_unique" ON "news_rss_sources" USING btree ("url");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rss_item_guid_or_link" ON "rss_items" USING btree ("source_id","guid","link");
--> statement-breakpoint
ALTER TABLE "news_rss_sources" ADD COLUMN IF NOT EXISTS "enabled" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "geographic_scope" text DEFAULT 'global';
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "admin_area" text;
--> statement-breakpoint
ALTER TABLE "ai_news_articles" ADD COLUMN IF NOT EXISTS "enabled" boolean DEFAULT true NOT NULL;
