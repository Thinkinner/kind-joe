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
import { articles, articleTags, tags } from "@/db/schema";

// 👇 Make sure this matches the actual slug in your DB
const EXCLUDED_TAG_SLUGS = ["kindjoetopstories" ,"ventura-county"];

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

async function getExcludedTagIds() {
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.slug, EXCLUDED_TAG_SLUGS));

  return rows.map((r) => r.id);
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

    // 2) Get IDs of the excluded tags (e.g. kindjoetopstories)
    const excludedTagIds = await getExcludedTagIds();

    // 3) Get *all* tag IDs for this article
    const articleTagRows = await db
      .select({
        tagId: articleTags.tagId,
      })
      .from(articleTags)
      .where(eq(articleTags.articleId, article.id));

    // Remove excluded tags from the "matching" tags
    const tagIds = articleTagRows
      .map((t) => t.tagId)
      .filter((id) => !excludedTagIds.includes(id));

    // If after excluding those tags nothing is left, we don't show related
    if (tagIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 4) Find IDs of articles that have any of the excluded tags
    let excludedArticleIds = new Set<string>();
    if (excludedTagIds.length > 0) {
      const excludedArticleRows = await db
        .select({ articleId: articleTags.articleId })
        .from(articleTags)
        .where(inArray(articleTags.tagId, excludedTagIds));

      excludedArticleIds = new Set(
        excludedArticleRows.map((row) => row.articleId)
      );
    }

    // 5) Find other published articles that share ANY of the non-excluded tags
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
        desc(articles.publishedAt),
        desc(articles.publishAt)
      )
      .limit(20);

    // 6) Deduplicate by article ID AND skip articles with excluded tags
    const seen = new Set<string>();
    const related: typeof relatedRaw = [];

    for (const row of relatedRaw) {
      // 👇 skip any article that has `kindjoetopstories` (or other excluded tags)
      if (excludedArticleIds.has(row.id)) {
        continue;
      }

      if (!seen.has(row.id)) {
        seen.add(row.id);
        related.push(row);
      }
    }

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
