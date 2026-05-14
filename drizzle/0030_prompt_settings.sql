CREATE TABLE IF NOT EXISTS "prompt_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "prompts" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
