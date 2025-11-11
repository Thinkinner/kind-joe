import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; // <- your drizzle instance
import { and, desc, eq, ilike, isNull, lte, sql } from "drizzle-orm";
import { articles, categories, tags, articleCategories, articleTags } from "@/db/schema";

// Helper: only show published, non-draft, not deleted
function publishedWhere(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    // Consider published if publishedAt <= now OR (no publishedAt but publishAt <= now)
    and(
      sql<boolean>`( ${articles.publishedAt} IS NOT NULL AND ${articles.publishedAt} <= ${now.toISOString()} )
        OR ( ${articles.publishedAt} IS NULL AND ${articles.publishAt} IS NOT NULL AND ${articles.publishAt} <= ${now.toISOString()} )`
    )
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);

    const q = searchParams.get("q") || "";                // full-text-ish (title/excerpt)
    const categorySlug = searchParams.get("category");    // e.g. "politics"
    const tagSlug = searchParams.get("tag");              // e.g. "election-2024"
    const now = new Date();

    const whereBase = publishedWhere(now);

    // text filter
    const textWhere = q
      ? ilike(sql`${articles.title} || ' ' || coalesce(${articles.excerpt}, '')`, `%${q}%`)
      : undefined;

    // category filter via EXISTS subquery
    const categoryWhere = categorySlug
      ? sql<boolean>`EXISTS (
          SELECT 1
          FROM ${articleCategories} ac
          JOIN ${categories} c ON c.id = ac.categoryId
          WHERE ac.article_id = ${articles.id}
            AND c.slug = ${categorySlug}
        )`
      : undefined;

    // tag filter via EXISTS subquery
    const tagWhere = tagSlug
      ? sql<boolean>`EXISTS (
          SELECT 1
          FROM ${articleTags} at
          JOIN ${tags} t ON t.id = at.tagId
          WHERE at.article_id = ${articles.id}
            AND t.slug = ${tagSlug}
        )`
      : undefined;

    const fullWhere = and(whereBase, textWhere, categoryWhere, tagWhere);

    // total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(fullWhere);

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        authorId: articles.authorId,
        publishedAt: articles.publishedAt,
        publishAt: articles.publishAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(fullWhere)
      .orderBy(desc(articles.publishedAt), desc(articles.publishAt), desc(articles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      data: rows,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.max(Math.ceil(Number(count) / pageSize), 1),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
