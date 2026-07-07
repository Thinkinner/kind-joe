import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, users, articleTags, tags } from "@/db/schema";
import { and, eq, isNull, sql, desc } from "drizzle-orm";

export const revalidate = 60;

const FEATURED_TAG_SLUG = "kindjoetopstories";

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

export async function GET() {
  const now = new Date();

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
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
    .orderBy(desc(articles.publishedAt))
    .limit(20);

  return NextResponse.json(rows);
}
