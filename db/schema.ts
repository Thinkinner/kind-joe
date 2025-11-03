// /db/schema.ts
import {
  pgTable, serial, text, varchar, timestamp, integer, jsonb, pgEnum, boolean, index
} from "drizzle-orm/pg-core";

export const blockType = pgEnum('block_type', [
  'heading', 'paragraph', 'image', 'quote', 'list', 'embed', 'code', 'hr'
]);



export const users = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),  // or serial
  name: varchar('name', { length: 120 }).notNull(),
  avatarUrl: text('avatar_url'),
});

export const articles = pgTable('articles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  excerpt: text('excerpt'),
  coverImage: jsonb('cover_image'), // {src, alt, width, height}
  category: varchar("category", { length: 50 }).default("General"),
  authorId: varchar('author_id', { length: 50 }).notNull().references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  readingMinutes: integer('reading_minutes'),
  isDraft: boolean('is_draft').notNull().default(true),
  seo: jsonb('seo'), // {title, description, ogImage}
}, (t) => ({
  slugIdx: index('articles_slug_idx').on(t.slug),
  publishedIdx: index('articles_published_idx').on(t.publishedAt),
}));

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull().unique(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull().unique(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
});

// m2m
export const articleCategories = pgTable('article_categories', {
  articleId: varchar('article_id', { length: 50 }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
});

export const articleTags = pgTable('article_tags', {
  articleId: varchar('article_id', { length: 50 }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// The magic: ordered content blocks
export const articleBlocks = pgTable('article_blocks', {
  id: serial('id').primaryKey(),
  articleId: varchar('article_id', { length: 50 }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(), // 0..N (unique per article)
  type: blockType('type').notNull(),
  data: jsonb('data').notNull(), // varies by type (see Zod below)
}, (t) => ({
  byArticleOrder: index('blocks_article_order_idx').on(t.articleId, t.order),
}));
