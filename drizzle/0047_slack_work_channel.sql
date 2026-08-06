ALTER TABLE "slack_link_assign_settings" ADD COLUMN IF NOT EXISTS "work_channel_id" varchar(64) DEFAULT '' NOT NULL;
