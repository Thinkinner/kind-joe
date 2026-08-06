// /db/schema.ts
import type { DbArticle, NewsletterData } from "@/lib/(newsletter-automations)/types";
import { relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
  unique,
  primaryKey,
  doublePrecision,
  uuid,
} from "drizzle-orm/pg-core";
import { user as authUser } from "./auth-schema";

export const blockType = pgEnum("block_type", [
  "heading",
  "paragraph",
  "image",
  "quote",
  "list",
  "embed",
  "code",
  "hr",
]);

export const roleEnum = pgEnum("role", ["Admin", "Writer", "Editor"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  aliasFullName: varchar("alias_full_name", { length: 120 }),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").notNull().default("Writer"),
});

export const articles = pgTable(
  "articles",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    excerpt: text("excerpt"),
    coverImageUrl: text("cover_image_url"),
    category: varchar("category", { length: 50 }).default("General"),
    authorId: varchar("author_id", { length: 128 })
      .notNull()
      .references(() => users.id),
    predictionId: integer("prediction_id").references(
      (): AnyPgColumn => predictionMarkets.id,
      { onDelete: "set null" },
    ),

    seo: jsonb("seo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    publishedBy: varchar("published_by", { length: 128 }).references(
      () => users.id,
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    readingMinutes: integer("reading_minutes"),
    isDraft: boolean("is_draft").notNull().default(true),

    content: jsonb("content"),
    contentMarkdown: text("content_markdown"),
    contentHtml: text("content_html"),
  },
  (t) => ({
    slugIdx: index("articles_slug_idx").on(t.slug),
    publishedIdx: index("articles_published_idx").on(t.publishedAt),
    listIdx: index("articles_list_idx").on(t.isDraft, t.publishedAt),
    predictionIdx: index("articles_prediction_id_idx").on(t.predictionId),
  }),
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
});

export const articleCategories = pgTable(
  "article_categories",
  {
    articleId: varchar("article_id", { length: 50 })
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.categoryId] }),
  }),
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: varchar("article_id", { length: 50 })
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.tagId] }),
  }),
);

export const articleEmbeddings = pgTable(
  "article_embeddings",
  {
    articleId: varchar("article_id", { length: 50 })
      .primaryKey()
      .references(() => articles.id, { onDelete: "cascade" }),
    model: varchar("model", { length: 120 }).notNull(),
    embedding: jsonb("embedding").$type<number[]>().notNull().default([]),
    sourceText: text("source_text").notNull(),
    sourceTextHash: varchar("source_text_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    modelIdx: index("article_embeddings_model_idx").on(t.model),
    hashIdx: index("article_embeddings_source_hash_idx").on(t.sourceTextHash),
    updatedIdx: index("article_embeddings_updated_at_idx").on(t.updatedAt),
  }),
);

export const rssSources = pgTable("rss_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  url: text("url").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  defaultCategorySlug: varchar("default_category_slug", { length: 120 }),
  defaultTags: jsonb("default_tags"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
});

export const rssItems = pgTable(
  "rss_items",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .references(() => rssSources.id, { onDelete: "cascade" })
      .notNull(),
    guid: text("guid").notNull(),
    link: text("link").notNull(),
    title: text("title"),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    raw: jsonb("raw"),
    processed: boolean("processed").notNull().default(false),
    articleId: varchar("article_id", { length: 50 }),
  },
  (t) => ({
    uniquePerSource: uniqueIndex("rss_item_guid_or_link").on(
      t.sourceId,
      t.guid,
      t.link,
    ),
  }),
);

export const aiJobs = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  rssItemId: integer("rss_item_id").references(() => rssItems.id, {
    onDelete: "cascade",
  }),
  status: varchar("status", { length: 40 }).notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const newsRssSource = pgTable(
  "news_rss_sources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    enabled: boolean("enabled").default(true),
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    urlUnique: uniqueIndex("news_rss_sources_url_unique").on(t.url),
  }),
);

export const newsRssArticles = pgTable(
  "news_rss_articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => newsRssSource.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    modifiedTitle: text("modified_title"),
    link: text("link").notNull(),
    imageUrl: text("image_url"),
    contentSnippet: text("content_snippet"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    aiProcessed: boolean("ai_processed").default(false).notNull(),
  },
  (t) => ({
    linkUnique: uniqueIndex("news_rss_articles_link_unique").on(t.link),
  }),
);

export const aiNewsArticles = pgTable(
  "ai_news_articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => newsRssSource.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    modifiedTitle: text("modified_title"),
    link: text("link").notNull(),
    imageUrl: text("image_url"),
    enabled: boolean("enabled").default(true).notNull(),
    contentSnippet: text("content_snippet"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    aiProcessed: boolean("ai_processed").default(false).notNull(),
  },
  (t) => ({
    linkUnique: uniqueIndex("ai_news_articles_link_unique").on(t.link),
  }),
);

/** Alias matching the newsletter CMS repo export name. */
export { aiNewsArticles as AI_News_Articles };

export const settingsTable = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookUrl: text("webhook_url").default(""),
  authorId: text("author_id").default(""),
  cloudinaryCloudName: text("cloudinary_cloud_name").default(""),
  cloudinaryApiKey: text("cloudinary_api_key").default(""),
  cloudinaryApiSecret: text("cloudinary_api_secret").default(""),
  cloudinaryUploadPreset: text("cloudinary_upload_preset").default(""),
  ghlApiKey: text("ghl_api_key").default(""),
  ghlLocationId: text("ghl_location_id").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Same table as `settingsTable`; use either name across repos. */
export const settings = settingsTable;

export const promptSettingsTable = pgTable("prompt_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  prompts: jsonb("prompts")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Same table as `promptSettingsTable`; use either name across repos. */
export const promptSettings = promptSettingsTable;

export const draftsTable = pgTable("newsletter_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").default("draft"),
  data: jsonb("data").$type<NewsletterData>().notNull(),
  articles: jsonb("articles").$type<DbArticle[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Same table as `draftsTable`; kept for older imports / tooling. */
export const newsletterDrafts = draftsTable;

export const rssAutoWriterQueue = pgTable(
  "rss_auto_writer_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rssArticleId: integer("rss_article_id")
      .notNull()
      .references(() => newsRssArticles.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name"),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    articleId: varchar("article_id", { length: 50 }).references(() => articles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    rssUniqueIdx: uniqueIndex("rss_auto_writer_queue_rss_article_unique").on(
      t.rssArticleId,
    ),
    statusIdx: index("rss_auto_writer_queue_status_idx").on(t.status, t.createdAt),
    lockIdx: index("rss_auto_writer_queue_lock_idx").on(t.lockedAt),
    sourceUrlIdx: index("rss_auto_writer_queue_source_url_idx").on(t.sourceUrl),
  }),
);

export const sourceFirstArticleJobs = pgTable(
  "source_first_article_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topic: text("topic").notNull(),
    adsenseReady: boolean("adsense_ready").notNull().default(false),
    writingMode: varchar("writing_mode", { length: 20 }).notNull().default("auto"),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    sources: jsonb("sources").default([]).notNull(),
    result: jsonb("result"),
    error: text("error"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("source_first_article_jobs_status_idx").on(
      t.status,
      t.createdAt,
    ),
    lockIdx: index("source_first_article_jobs_lock_idx").on(t.lockedAt),
    createdByIdx: index("source_first_article_jobs_created_by_idx").on(t.createdBy),
  }),
);

export const aiAutomationRssSources = pgTable("ai_automation_rss_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export { aiAutomationRssSources as AI_Automations_Source };

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    destinationUrl: text("destination_url").notNull(),
    caption: text("caption"),
    isPinned: boolean("is_pinned").default(false),
    order: integer("order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    feedIdx: index("posts_feed_idx").on(t.isActive, t.isPinned, t.order, t.id),
  }),
);

export const venturaPosts = pgTable(
  "ventura_posts",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    destinationUrl: text("destination_url").notNull(),
    caption: text("caption"),
    isPinned: boolean("is_pinned").default(false),
    order: integer("order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    feedIdx: index("ventura_posts_feed_idx").on(
      t.isActive,
      t.isPinned,
      t.order,
      t.id,
    ),
  }),
);

export const joeknowslaPosts = pgTable(
  "joeknowsla_posts",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    destinationUrl: text("destination_url").notNull(),
    caption: text("caption"),
    isPinned: boolean("is_pinned").default(false),
    order: integer("order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    feedIdx: index("joeknowsla_posts_feed_idx").on(
      t.isActive,
      t.isPinned,
      t.order,
      t.id,
    ),
  }),
);

export const joefromsloPosts = pgTable(
  "joefromslo_posts",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    destinationUrl: text("destination_url").notNull(),
    caption: text("caption"),
    isPinned: boolean("is_pinned").default(false),
    order: integer("order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    feedIdx: index("joefromslo_posts_feed_idx").on(
      t.isActive,
      t.isPinned,
      t.order,
      t.id,
    ),
  }),
);

export const kindjoeClipSubmissions = pgTable(
  "kindjoe_clip_submissions",
  {
    id: serial("id").primaryKey(),
    ageGroup: varchar("age_group", { length: 20 }).notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    clipUrl: text("clip_url").notNull(),
    filmedLocation: text("filmed_location").notNull(),
    hasDescription: boolean("has_description").notNull().default(false),
    clipDescription: text("clip_description"),
    recordedBySubmitter: boolean("recorded_by_submitter").notNull(),
    wantsClipCredit: boolean("wants_clip_credit").notNull().default(false),
    paypalEmail: varchar("paypal_email", { length: 255 }),
    digitalSignature: varchar("digital_signature", { length: 255 }).notNull(),
    acceptsSubmissionTerms: boolean("accepts_submission_terms").notNull(),
    confirmsNoExclusiveAgreement: boolean("confirms_no_exclusive_agreement").notNull(),
    confirmsClipGuidelines: boolean("confirms_clip_guidelines").notNull(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("kindjoe_clip_submissions_created_at_idx").on(t.createdAt),
    emailIdx: index("kindjoe_clip_submissions_email_idx").on(t.email),
  }),
);

export const venturaBusinessInquiries = pgTable(
  "ventura_business_inquiries",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull(),
    businessName: varchar("business_name", { length: 200 }).notNull(),
    source: varchar("source", { length: 80 }).notNull().default("ventura_posts"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    createdAtIdx: index("ventura_business_inquiries_created_at_idx").on(
      t.createdAt,
    ),
    emailIdx: index("ventura_business_inquiries_email_idx").on(t.email),
  }),
);

export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    href: text("href"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    createdAtIdx: index("admin_notifications_created_at_idx").on(t.createdAt),
    typeIdx: index("admin_notifications_type_idx").on(t.type),
  }),
);

export const adminNotificationReads = pgTable(
  "admin_notification_reads",
  {
    notificationId: integer("notification_id")
      .notNull()
      .references(() => adminNotifications.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.notificationId, t.userId] }),
    userIdx: index("admin_notification_reads_user_idx").on(t.userId),
  }),
);

/** Daily staff duty check-in (America/Los_Angeles calendar date as YYYY-MM-DD). */
export const staffDutyCheckins = pgTable(
  "staff_duty_checkins",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    dutyDate: varchar("duty_date", { length: 10 }).notNull(),
    workingToday: boolean("working_today").notNull().default(false),
    workingKindJoe: boolean("working_kind_joe").notNull().default(false),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userDateUq: unique("staff_duty_checkins_user_date_uq").on(
      t.userId,
      t.dutyDate,
    ),
    dateIdx: index("staff_duty_checkins_date_idx").on(t.dutyDate),
    kindJoeIdx: index("staff_duty_checkins_kindjoe_idx").on(
      t.dutyDate,
      t.workingKindJoe,
    ),
  }),
);

/** Maps Kind Joe staff accounts to Slack user IDs for @mentions. */
export const staffSlackLinks = pgTable(
  "staff_slack_links",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUser.id, { onDelete: "cascade" }),
    slackUserId: varchar("slack_user_id", { length: 64 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    slackUserUq: uniqueIndex("staff_slack_links_slack_user_uq").on(t.slackUserId),
  }),
);

/** Singleton-ish config for which Slack channel auto-assigns links (set in admin). */
export const slackLinkAssignSettings = pgTable("slack_link_assign_settings", {
  id: integer("id").primaryKey().default(1),
  channelId: varchar("channel_id", { length: 64 }).notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
});

export const linkAssignmentStatusEnum = pgEnum("link_assignment_status", [
  "assigned",
  "done",
  "skipped",
]);

/** Auto-assigned Slack links (X/Twitter) for staff working Kind Joe. */
export const linkAssignments = pgTable(
  "link_assignments",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    slackChannelId: varchar("slack_channel_id", { length: 64 }).notNull(),
    slackMessageTs: varchar("slack_message_ts", { length: 64 }).notNull(),
    postedBySlackUserId: varchar("posted_by_slack_user_id", { length: 64 }),
    assigneeUserId: text("assignee_user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    status: linkAssignmentStatusEnum("status").notNull().default("assigned"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    msgUrlUq: uniqueIndex("link_assignments_msg_url_uq").on(
      t.slackChannelId,
      t.slackMessageTs,
      t.url,
    ),
    assigneeStatusIdx: index("link_assignments_assignee_status_idx").on(
      t.assigneeUserId,
      t.status,
    ),
    assignedAtIdx: index("link_assignments_assigned_at_idx").on(t.assignedAt),
  }),
);

export const kindjoeProfileLinks = pgTable(
  "kindjoe_profile_links",
  {
    id: serial("id").primaryKey(),
    label: varchar("label", { length: 140 }).notNull(),
    href: text("href").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index("kindjoe_profile_links_order_idx").on(t.order),
    activeIdx: index("kindjoe_profile_links_active_idx").on(t.isActive),
    createdAtIdx: index("kindjoe_profile_links_created_at_idx").on(t.createdAt),
  }),
);

export const socialProfiles = pgTable(
  "social_profiles",
  {
    id: serial("id").primaryKey(),
    handle: varchar("handle", { length: 80 }).notNull(),
    displayName: varchar("display_name", { length: 140 }).notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    handleUnique: uniqueIndex("social_profiles_handle_unique").on(t.handle),
    activeIdx: index("social_profiles_active_idx").on(t.isActive),
    createdAtIdx: index("social_profiles_created_at_idx").on(t.createdAt),
  }),
);

export const socialProfileLinks = pgTable(
  "social_profile_links",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => socialProfiles.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 140 }).notNull(),
    href: text("href").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileOrderIdx: index("social_profile_links_profile_order_idx").on(t.profileId, t.order),
    profileActiveIdx: index("social_profile_links_profile_active_idx").on(
      t.profileId,
      t.isActive,
    ),
    profileCreatedAtIdx: index("social_profile_links_profile_created_at_idx").on(
      t.profileId,
      t.createdAt,
    ),
  }),
);

export const socialProfileSocialLinks = pgTable(
  "social_profile_social_links",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => socialProfiles.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 40 }).notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    href: text("href").notNull(),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    openInNewTab: boolean("open_in_new_tab").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profileOrderIdx: index("social_profile_social_links_profile_order_idx").on(
      t.profileId,
      t.order,
    ),
    profileActiveIdx: index("social_profile_social_links_profile_active_idx").on(
      t.profileId,
      t.isActive,
    ),
  }),
);

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  /** Original publisher / platform for the story (`Source` union), not the ingest pipe (e.g. Discord → X link ⇒ `X`). */
  source: text("source").notNull(),
  /** Canonical story URL when known (article, post, etc.); not Discord attachment/CDN unless no other URL exists. */
  sourceUrl: text("source_url"),
  /** Canonical source URL with tracking params stripped. */
  canonicalSourceUrl: text("canonical_source_url"),
  /** Source identity metadata for UI cards. */
  sourceDisplayName: text("source_display_name"),
  sourceHandle: text("source_handle"),
  sourceIconKey: text("source_icon_key"),
  sourceAvatarUrl: text("source_avatar_url"),
  sourceVerified: boolean("source_verified").default(false),
  /** Reputation metadata (Glint-like HIGH/MED/LOW mapping). */
  trustTier: text("trust_tier").default("medium"),
  trustScore: integer("trust_score").default(50),
  /** Extracted image/media candidates from markdown or links. */
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  category: text("category"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  enrichmentProvider: text("enrichment_provider"),
  enrichmentModel: text("enrichment_model"),
  enrichmentConfidence: doublePrecision("enrichment_confidence"),
  city: text("city"),
  country: text("country"),
  geographicScope: text("geographic_scope").notNull().default("global"),
  adminArea: text("admin_area"),
  impactScore: integer("impact_score").default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  timestamp: timestamp("timestamp", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
});

export const incomingEvents = pgTable(
  "incoming_events",
  {
    id: serial("id").primaryKey(),
    externalEventId: text("external_event_id"),
    source: text("source").notNull().default("X"),
    text: text("text").notNull(),
    sourceUrl: text("source_url"),
    sourceDisplayName: text("source_display_name"),
    sourceHandle: text("source_handle"),
    sourceAvatarUrl: text("source_avatar_url"),
    sourceVerified: boolean("source_verified").notNull().default(false),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    extEventIdx: index("incoming_events_external_event_id_idx").on(t.externalEventId),
    sourceIdx: index("incoming_events_source_idx").on(t.source),
    receivedIdx: index("incoming_events_received_at_idx").on(t.receivedAt),
  }),
);

export const outgoingWebhooks = pgTable(
  "outgoing_webhooks",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    url: text("url").notNull(),
    authorizationToken: text("authorization_token"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    urlUnique: uniqueIndex("outgoing_webhooks_url_unique").on(t.url),
    enabledIdx: index("outgoing_webhooks_enabled_idx").on(t.enabled),
  }),
);

export const outgoingWebhookDeliveries = pgTable(
  "outgoing_webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    webhookId: integer("webhook_id")
      .notNull()
      .references(() => outgoingWebhooks.id, { onDelete: "cascade" }),
    incomingEventId: integer("incoming_event_id").references(
      () => incomingEvents.id,
      { onDelete: "set null" },
    ),
    attempt: integer("attempt").notNull().default(1),
    status: varchar("status", { length: 24 }).notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    error: text("error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    webhookIdx: index("outgoing_webhook_deliveries_webhook_id_idx").on(t.webhookId),
    incomingEventIdx: index("outgoing_webhook_deliveries_incoming_event_id_idx").on(
      t.incomingEventId,
    ),
    deliveredAtIdx: index("outgoing_webhook_deliveries_delivered_at_idx").on(
      t.deliveredAt,
    ),
  }),
);

export const predictionMarketStatusEnum = pgEnum("prediction_market_status", [
  "open",
  "locked",
  "resolved",
]);
export const predictionCategoryEnum = pgEnum("prediction_category", [
  "general",
  "politics",
  "economy",
  "technology",
  "science",
  "sports",
  "world",
  "culture",
]);

export const predictionMarkets = pgTable(
  "prediction_markets",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    category: predictionCategoryEnum("category").notNull().default("general"),
    status: predictionMarketStatusEnum("status").notNull().default("open"),
    opensAt: timestamp("opens_at", { withTimezone: true }).defaultNow().notNull(),
    locksAt: timestamp("locks_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    winningOptionId: integer("winning_option_id").references(
      (): AnyPgColumn => predictionOptions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugUnique: uniqueIndex("prediction_markets_slug_unique").on(t.slug),
    statusIdx: index("prediction_markets_status_idx").on(t.status),
    categoryIdx: index("prediction_markets_category_idx").on(t.category),
    opensAtIdx: index("prediction_markets_opens_at_idx").on(t.opensAt),
    locksAtIdx: index("prediction_markets_locks_at_idx").on(t.locksAt),
  }),
);

export const predictionOptions = pgTable(
  "prediction_options",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 180 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    marketIdx: index("prediction_options_market_id_idx").on(t.marketId),
    marketSortUnique: uniqueIndex("prediction_options_market_sort_unique").on(
      t.marketId,
      t.sortOrder,
    ),
  }),
);

export const predictionVotes = pgTable(
  "prediction_votes",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => predictionOptions.id, { onDelete: "cascade" }),
    voterId: text("voter_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    marketIdx: index("prediction_votes_market_id_idx").on(t.marketId),
    optionIdx: index("prediction_votes_option_id_idx").on(t.optionId),
    voterIdx: index("prediction_votes_voter_id_idx").on(t.voterId),
    oneVotePerMarket: uniqueIndex("prediction_votes_market_voter_unique").on(
      t.marketId,
      t.voterId,
    ),
  }),
);

export const predictionAnonVotes = pgTable(
  "prediction_anon_votes",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => predictionOptions.id, { onDelete: "cascade" }),
    voterKey: varchar("voter_key", { length: 190 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    marketIdx: index("prediction_anon_votes_market_id_idx").on(t.marketId),
    optionIdx: index("prediction_anon_votes_option_id_idx").on(t.optionId),
    voterIdx: index("prediction_anon_votes_voter_key_idx").on(t.voterKey),
    oneVotePerMarketPerKey: uniqueIndex("prediction_anon_votes_market_voter_unique").on(
      t.marketId,
      t.voterKey,
    ),
  }),
);

export const predictionLikes = pgTable(
  "prediction_likes",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    marketIdx: index("prediction_likes_market_id_idx").on(t.marketId),
    userIdx: index("prediction_likes_user_id_idx").on(t.userId),
    oneLikePerMarketPerUser: uniqueIndex("prediction_likes_market_user_unique").on(
      t.marketId,
      t.userId,
    ),
  }),
);

export const predictionComments = pgTable(
  "prediction_comments",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references(
      (): AnyPgColumn => predictionComments.id,
      { onDelete: "cascade" },
    ),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    marketCreatedIdx: index("prediction_comments_market_created_idx").on(
      t.marketId,
      t.createdAt,
    ),
    parentIdx: index("prediction_comments_parent_id_idx").on(t.parentId),
  }),
);

export const socialAttachmentTypeEnum = pgEnum("social_attachment_type", [
  "image",
  "link",
]);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: serial("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    authorCreatedIdx: index("social_posts_author_created_idx").on(
      t.authorId,
      t.createdAt,
    ),
    createdIdx: index("social_posts_created_idx").on(t.createdAt),
  }),
);

export const socialPostAttachments = pgTable(
  "social_post_attachments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPosts.id, { onDelete: "cascade" }),
    type: socialAttachmentTypeEnum("type").notNull(),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    imageUrl: text("image_url"),
    siteName: text("site_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    postIdx: index("social_post_attachments_post_id_idx").on(t.postId),
  }),
);

export const socialPostComments = pgTable(
  "social_post_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references(
      (): AnyPgColumn => socialPostComments.id,
      { onDelete: "cascade" },
    ),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    postCreatedIdx: index("social_post_comments_post_created_idx").on(
      t.postId,
      t.createdAt,
    ),
    parentIdx: index("social_post_comments_parent_id_idx").on(t.parentId),
  }),
);

export const socialUserProfiles = pgTable(
  "social_user_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUser.id, { onDelete: "cascade" }),
    bio: text("bio"),
    location: varchar("location", { length: 120 }),
    websiteUrl: text("website_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    updatedIdx: index("social_user_profiles_updated_idx").on(t.updatedAt),
  }),
);
