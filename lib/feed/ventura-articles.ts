import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
  categories,
  tags,
  users,
} from "@/db/schema";
import { getPredictionMarketById } from "@/lib/predictions/queries";

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
  authorAlias: string | null;
  authorName: string;
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
      authorAlias: sql<string | null>`nullif(${users.aliasFullName}, '')`,
      authorName: users.name,
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

export type VenturaArticleDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string | null;
  authorId: string;
  authorAlias: string | null;
  authorName: string;
  authorAvatar: string | null;
  contentHtml: string | null;
  content: unknown;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  readingMinutes: number | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  linkedPrediction: Awaited<ReturnType<typeof getPredictionMarketById>> | null;
};

export async function getVenturaArticleDetailBySlug(
  slug: string,
): Promise<VenturaArticleDetail | null> {
  const now = new Date();

  const [article] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      category: articles.category,
      authorId: articles.authorId,
      authorAlias: sql<string | null>`nullif(${users.aliasFullName}, '')`,
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
    .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(
      and(
        eq(articles.slug, slug),
        eq(tags.slug, FEATURED_TAG_SLUG),
        publishedFilter(now),
      ),
    )
    .limit(1);

  if (!article) return null;

  const articleCategoriesRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(articleCategories)
    .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
    .where(eq(articleCategories.articleId, article.id));

  const articleTagsRows = await db
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

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImageUrl: article.coverImageUrl,
    category: article.category,
    authorId: article.authorId,
    authorAlias: article.authorAlias,
    authorName: article.authorName,
    authorAvatar: article.authorAvatar,
    contentHtml: article.contentHtml,
    content: article.content,
    publishedAt: article.publishedAt,
    publishAt: article.publishAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    readingMinutes: article.readingMinutes,
    categories: articleCategoriesRows,
    tags: articleTagsRows,
    linkedPrediction,
  };
}
