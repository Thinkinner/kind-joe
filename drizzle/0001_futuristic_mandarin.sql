CREATE TABLE "newsletter_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'draft',
	"data" jsonb NOT NULL,
	"articles" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
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
