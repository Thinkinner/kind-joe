// /db/schema.ts
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

export const roleEnum = pgEnum("role", ["Admin", "Writer", "Editor"]); // 👈

export const users = pgTable("users", {
  // Use Clerk user ID directly as primary key
  id: varchar("id", { length: 128 }).primaryKey(), // Clerk userId is a string
  name: varchar("name", { length: 120 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").notNull().default("Writer"), // 👈 default role
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

    // ✅ Tracking + publishing metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }), // actual publish time
    publishAt: timestamp("publish_at", { withTimezone: true }), // scheduled publish time
    publishedBy: varchar("published_by", { length: 128 }).references(
      () => users.id
    ), // optional
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete

    readingMinutes: integer("reading_minutes"),
    isDraft: boolean("is_draft").notNull().default(true),

    seo: jsonb("seo"),
    content: jsonb("content").notNull(),
    contentHtml: text("content_html"),
  },
  (t) => ({
    slugIdx: index("articles_slug_idx").on(t.slug),
    publishedIdx: index("articles_published_idx").on(t.publishedAt),
    // 🧠 new combined index for dashboard/public lists
    listIdx: index("articles_list_idx").on(t.isDraft, t.publishedAt),
  })
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

// m2m
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
  })
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
  })
);

// RSS FETCH AND AUTOMATIC POST

export const rssSources = pgTable("rss_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  url: text("url").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  defaultCategorySlug: varchar("default_category_slug", { length: 120 }),
  defaultTags: jsonb("default_tags"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
});

// --- RSS items (each entry we see in a feed)
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
    // ensures we only process a guid/link once per source
    uniquePerSource: uniqueIndex("rss_item_guid_or_link").on(
      t.sourceId,
      t.guid,
      t.link
    ),
  })
);

// --- Optional: AI job log
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

// Drudge Report Referrence

export const newsRssSource = pgTable(
  "news_rss_sources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // unique index name scoped to this table name to avoid collisions
    urlUnique: uniqueIndex("news_rss_sources_url_unique").on(t.url),
  })
);

// Articles
export const newsRssArticles = pgTable(
  "news_rss_articles",
  {
    id: serial("id").primaryKey(),

    // FK should be integer, not serial; must reference the correct table
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
    // choose ONE of these depending on your de-dupe strategy:

    // If a link is globally unique across all sources:
    linkUnique: uniqueIndex("news_rss_articles_link_unique").on(t.link),

    // OR if the same link can appear in multiple sources, comment the above
    // and use a composite unique per source:
    // perSourceLinkUnique: uniqueIndex("news_rss_articles_source_link_unique").on(t.sourceId, t.link),
  })
);
