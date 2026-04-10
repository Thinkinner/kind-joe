CREATE TABLE "staff_invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "staff_role" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accepted_at" timestamp with time zone
);
CREATE INDEX "staff_invitation_email_idx" ON "staff_invitation" ("email");
