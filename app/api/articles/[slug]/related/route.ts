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
import { articles, articleTags, tags } from "@/db/schema"; // 👈 add `tags`


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

const EXCLUDED_TAG_SLUGS = ["kindjoetopstories", "ventura-county"]; // 👈 your special tagconst 

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

    // 2) Get the IDs of tags we want to ignore for "related" logic
    const excludedTagIds = await getExcludedTagIds(); // [number, number, ...]

    // 3) Get *all* tag IDs for this article
    const articleTagRows = await db
      .select({
        tagId: articleTags.tagId,
      })
      .from(articleTags)
      .where(eq(articleTags.articleId, article.id));

    // Filter out excluded tags (e.g. kindjoe-topstories)
    const tagIds = articleTagRows
      .map((t) => t.tagId)
      .filter((id) => !excludedTagIds.includes(id));

    if (tagIds.length === 0) {
      // No usable tags = no tag-based related articles
      return NextResponse.json({ items: [] });
    }

    // 4) Find other published articles that share ANY of those (non-excluded) tags
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

    // 5) Deduplicate by article ID
    const seen = new Set<string>();
    const related: typeof relatedRaw = [];

    for (const row of relatedRaw) {
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
