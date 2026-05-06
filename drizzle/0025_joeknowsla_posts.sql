CREATE TABLE IF NOT EXISTS "joeknowsla_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"destination_url" text NOT NULL,
	"caption" text,
	"is_pinned" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
