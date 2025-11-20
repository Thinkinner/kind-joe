// app/api/articles/[slug]/related/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  and,
  eq,
  inArray,
  ne,
  isNull,
  sql,
  desc,
} from "drizzle-orm";
import { articles, articleTags } from "@/db/schema";

// Reuse the same published filter as your main article route
function publishedWhere(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`(
      ${articles.publishedAt} IS NOT NULL
      AND ${articles.publishedAt} <= ${now.toISOString()}
    )
    OR (
      ${articles.publishedAt} IS NULL
      AND ${articles.publishAt} IS NOT NULL
      AND ${articles.publishAt} <= ${now.toISOString()}
    )`
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = await params;
    const now = new Date();

    // 1) Find the current article by slug (ensure it's published)
    const [article] = await db
      .select({
        id: articles.id,
      })
      .from(articles)
      .where(and(eq(articles.slug, slug), publishedWhere(now)))
      .limit(1);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // 2) Get tag IDs for this article
    const articleTagRows = await db
      .select({
        tagId: articleTags.tagId,
      })
      .from(articleTags)
      .where(eq(articleTags.articleId, article.id));

    if (articleTagRows.length === 0) {
      // No tags = no tag-based related articles
      return NextResponse.json({ items: [] });
    }

    const tagIds = articleTagRows.map((t) => t.tagId);

    // 3) Find other published articles that share any of those tags
    const relatedRaw = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        publishedAt: articles.publishedAt,
        publishAt: articles.publishAt,
        readingMinutes: articles.readingMinutes,
      })
      .from(articles)
      .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
      .where(
        and(
          inArray(articleTags.tagId, tagIds),
          ne(articles.id, article.id), // exclude current article
          publishedWhere(now)
        )
      )
      .orderBy(
        // most recently published first
        desc(articles.publishedAt),
        desc(articles.publishAt)
      )
      .limit(20); // pull a decent pool, we'll dedupe in JS

    // 4) Deduplicate by article ID (in case an article shares multiple tags)
    const seen = new Set<string>();
    const related: typeof relatedRaw = [];

    for (const row of relatedRaw) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        related.push(row);
      }
    }

    // Optionally limit what you send to the client (e.g. top 6)
    return NextResponse.json({
      items: related.slice(0, 6),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch related articles" },
      { status: 500 }
    );
  }
}
