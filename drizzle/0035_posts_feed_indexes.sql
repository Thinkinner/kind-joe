CREATE INDEX IF NOT EXISTS "posts_feed_idx" ON "posts" USING btree ("is_active","is_pinned","order","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ventura_posts_feed_idx" ON "ventura_posts" USING btree ("is_active","is_pinned","order","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "joeknowsla_posts_feed_idx" ON "joeknowsla_posts" USING btree ("is_active","is_pinned","order","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clicks_post_id_idx" ON "clicks" USING btree ("post_id");
