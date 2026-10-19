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
import { marked } from "marked";
import { getPredictionMarketById } from "@/lib/predictions/queries";
import {
  appendBackTaxesCtaHtml,
  appendBackTaxesCtaMarkdown,
} from "@/lib/content/back-taxes-cta";
import { getArticlePromoSettings } from "@/lib/content/article-promo-settings";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import { resolveArticleContentMarkdown } from "@/lib/content/resolve-article-content-markdown";
import { embedYouTubeLinksInHtml } from "@/lib/media/youtube";

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
        authorName: sql<string | null>`coalesce(nullif(${articles.seo}->>'authorName', ''), ${users.name})`,
        authorAvatar: users.avatarUrl,
        contentHtml: articles.contentHtml,
        contentMarkdown: articles.contentMarkdown,
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

    const resolvedMarkdown = resolveArticleContentMarkdown({
      contentMarkdown: article.contentMarkdown,
      content: article.content,
      contentHtml: article.contentHtml,
    });
    const renderedMarkdown = resolvedMarkdown
      ? embedYouTubeLinksInHtml(
          marked.parse(normalizeArticleMarkdown(resolvedMarkdown), {
            async: false,
          }) as string,
        )
      : "";
    const promo = await getArticlePromoSettings();
    const contentHtml = appendBackTaxesCtaHtml(
      article.contentHtml?.trim() || renderedMarkdown,
      promo,
    );
    const contentMarkdown = appendBackTaxesCtaMarkdown(resolvedMarkdown ?? "", promo);

    return NextResponse.json({
      ...article,
      contentHtml,
      contentMarkdown,
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
