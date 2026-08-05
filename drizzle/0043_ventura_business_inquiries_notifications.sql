CREATE TABLE IF NOT EXISTS "ventura_business_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) NOT NULL,
	"business_name" varchar(200) NOT NULL,
	"source" varchar(80) DEFAULT 'ventura_posts' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ventura_business_inquiries_created_at_idx" ON "ventura_business_inquiries" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ventura_business_inquiries_email_idx" ON "ventura_business_inquiries" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(80) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_created_at_idx" ON "admin_notifications" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notifications_type_idx" ON "admin_notifications" ("type");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notification_reads" (
	"notification_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_notification_reads_notification_id_user_id_pk" PRIMARY KEY("notification_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_notification_id_admin_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."admin_notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_notification_reads_user_idx" ON "admin_notification_reads" ("user_id");
