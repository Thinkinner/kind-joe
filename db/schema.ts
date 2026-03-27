// /db/schema.ts
import type { DbArticle, NewsletterData } from "@/lib/(newsletter-automations)/types";
import { relations } from "drizzle-orm";
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
  primaryKey,
  doublePrecision,
  uuid,
} from "drizzle-orm/pg-core";

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

    content: jsonb("content").notNull(),
    contentHtml: text("content_html"),
  },
  (t) => ({
    slugIdx: index("articles_slug_idx").on(t.slug),
    publishedIdx: index("articles_published_idx").on(t.publishedAt),
    listIdx: index("articles_list_idx").on(t.isDraft, t.publishedAt),
  }),
);

export const articlePageviews = pgTable(
  "article_pageviews",
  {
    id: serial("id").primaryKey(),
    articleId: varchar("article_id", { length: 50 })
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    referrer: text("referrer"),
    trafficSource: varchar("traffic_source", { length: 100 }),
    visitorId: varchar("visitor_id", { length: 128 }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    articleIdx: index("pageviews_article_id_idx").on(t.articleId),
    sourceIdx: index("pageviews_traffic_source_idx").on(t.trafficSource),
    dateIdx: index("pageviews_viewed_at_idx").on(t.viewedAt),
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

export const aiAutomationRssSources = pgTable("ai_automation_rss_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export { aiAutomationRssSources as AI_Automations_Source };

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  destinationUrl: text("destination_url").notNull(),
  caption: text("caption"),
  isPinned: boolean("is_pinned").default(false),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clicks = pgTable("clicks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  device: text("device"),
  referrer: text("referrer"),
});

export const postRelations = relations(posts, ({ many }) => ({
  clicks: many(clicks),
}));

export const clickRelations = relations(clicks, ({ one }) => ({
  post: one(posts, { fields: [clicks.postId], references: [posts.id] }),
}));

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  source: text("source").notNull(),
  /** Kind Joe signals: story permalink when known (migration `0003_signals_source_url`). */
  sourceUrl: text("source_url"),
  category: text("category").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
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
