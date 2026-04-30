import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, articles, tags, users } from "@/db/schema";

const FEATURED_TAG_SLUG = "ventura-county";

function publishedFilter(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`(
      (
        ${articles.publishedAt} IS NOT NULL
        AND ${articles.publishedAt} <= ${now}
      )
      OR (
        ${articles.publishedAt} IS NULL
        AND ${articles.publishAt} IS NOT NULL
        AND ${articles.publishAt} <= ${now}
      )
    )`,
  );
}

export type VenturaArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date | null;
  readingMinutes: number | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

export async function listVenturaArticleSummaries(): Promise<VenturaArticleSummary[]> {
  const now = new Date();

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      category: articles.category,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      createdAt: articles.createdAt,
      readingMinutes: articles.readingMinutes,
      authorName: sql<string | null>`coalesce(nullif(${articles.seo}->>'authorName', ''), ${users.name})`,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(articles)
    .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(and(eq(tags.slug, FEATURED_TAG_SLUG), publishedFilter(now)))
    .orderBy(desc(articles.publishedAt));

  return rows;
}
