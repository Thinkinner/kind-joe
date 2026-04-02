CREATE TABLE "incoming_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_event_id" text,
	"source" text DEFAULT 'X' NOT NULL,
	"text" text NOT NULL,
	"source_url" text,
	"source_display_name" text,
	"source_handle" text,
	"source_avatar_url" text,
	"source_verified" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"meta" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outgoing_webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"incoming_event_id" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" varchar(24) NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outgoing_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"url" text NOT NULL,
	"authorization_token" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outgoing_webhook_deliveries" ADD CONSTRAINT "outgoing_webhook_deliveries_webhook_id_outgoing_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."outgoing_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_webhook_deliveries" ADD CONSTRAINT "outgoing_webhook_deliveries_incoming_event_id_incoming_events_id_fk" FOREIGN KEY ("incoming_event_id") REFERENCES "public"."incoming_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incoming_events_external_event_id_idx" ON "incoming_events" USING btree ("external_event_id");--> statement-breakpoint
CREATE INDEX "incoming_events_source_idx" ON "incoming_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "incoming_events_received_at_idx" ON "incoming_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "outgoing_webhook_deliveries_webhook_id_idx" ON "outgoing_webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "outgoing_webhook_deliveries_incoming_event_id_idx" ON "outgoing_webhook_deliveries" USING btree ("incoming_event_id");--> statement-breakpoint
CREATE INDEX "outgoing_webhook_deliveries_delivered_at_idx" ON "outgoing_webhook_deliveries" USING btree ("delivered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outgoing_webhooks_url_unique" ON "outgoing_webhooks" USING btree ("url");--> statement-breakpoint
CREATE INDEX "outgoing_webhooks_enabled_idx" ON "outgoing_webhooks" USING btree ("enabled");