CREATE TYPE "public"."block_type" AS ENUM('heading', 'paragraph', 'image', 'quote', 'list', 'embed', 'code', 'hr');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Admin', 'Writer', 'Editor');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"rss_item_id" integer,
	"status" varchar(40) DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"article_id" varchar(50) NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "article_categories_article_id_category_id_pk" PRIMARY KEY("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" varchar(50) NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"excerpt" text,
	"cover_image_url" text,
	"category" varchar(50) DEFAULT 'General',
	"author_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"publish_at" timestamp with time zone,
	"published_by" varchar(128),
	"deleted_at" timestamp with time zone,
	"reading_minutes" integer,
	"is_draft" boolean DEFAULT true NOT NULL,
	"seo" jsonb,
	"content" jsonb NOT NULL,
	"content_html" text,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_aggregator_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"source_name" varchar(160),
	"source_url" text NOT NULL,
	"original_title" text NOT NULL,
	"ai_title" text,
	"final_title" text NOT NULL,
	"summary" text,
	"content" text,
	"image_url" text,
	"display_image" boolean DEFAULT true NOT NULL,
	"tags" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(16) DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_aggregator_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"default_category_slug" varchar(120),
	"default_tags" jsonb,
	"last_fetched_at" timestamp with time zone,
	"show_images" boolean DEFAULT true NOT NULL,
	"image_allowlist" jsonb,
	"image_blocklist" jsonb,
	CONSTRAINT "news_aggregator_sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "rss_items" (
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
CREATE TABLE "rss_sources" (
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
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"avatar_url" text,
	"role" "role" DEFAULT 'Writer' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_rss_item_id_rss_items_id_fk" FOREIGN KEY ("rss_item_id") REFERENCES "public"."rss_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_items" ADD CONSTRAINT "rss_items_source_id_rss_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."rss_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_list_idx" ON "articles" USING btree ("is_draft","published_at");--> statement-breakpoint
CREATE INDEX "news_aggregator_posts_published_idx" ON "news_aggregator_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_aggregator_posts_status_idx" ON "news_aggregator_posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rss_item_guid_or_link" ON "rss_items" USING btree ("source_id","guid","link");