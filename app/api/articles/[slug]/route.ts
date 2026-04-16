// app/api/articles/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  articles,
  articleCategories,
  categories,
  articleTags,
  tags,
  users,
} from "@/db/schema";
import { getPredictionMarketById } from "@/lib/predictions/queries";

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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const now = new Date();

    // main article + author
    const [article] = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        authorId: articles.authorId,
        authorName: users.name,
        authorAvatar: users.avatarUrl,
        contentHtml: articles.contentHtml,
        content: articles.content,
        publishedAt: articles.publishedAt,
        publishAt: articles.publishAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        readingMinutes: articles.readingMinutes,
        predictionId: articles.predictionId,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(
        and(
          eq(articles.slug, slug),
          publishedWhere(now) // only return if actually published
        )
      )
      .limit(1);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // categories
    const cats = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(articleCategories)
      .innerJoin(
        categories,
        eq(articleCategories.categoryId, categories.id)
      )
      .where(eq(articleCategories.articleId, article.id));

    // tags
    const tgs = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id));

    const linkedPrediction =
      typeof article.predictionId === "number" && Number.isFinite(article.predictionId)
        ? await getPredictionMarketById(article.predictionId)
        : null;

    return NextResponse.json({
      ...article,
      categories: cats,
      tags: tgs,
      linkedPrediction,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}
