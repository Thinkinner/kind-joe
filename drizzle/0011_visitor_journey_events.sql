CREATE TABLE IF NOT EXISTS "visitor_journey_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" varchar(128) NOT NULL,
  "visitor_id" varchar(128),
  "path" text NOT NULL,
  "query" text,
  "referrer" text,
  "user_agent" text,
  "viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "visitor_journey_session_idx"
  ON "visitor_journey_events" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "visitor_journey_visitor_idx"
  ON "visitor_journey_events" USING btree ("visitor_id");
CREATE INDEX IF NOT EXISTS "visitor_journey_viewed_at_idx"
  ON "visitor_journey_events" USING btree ("viewed_at");
