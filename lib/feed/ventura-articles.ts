import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import {
  articleCategories,
  articleTags,
  articles,
  categories,
  tags,
  users,
} from "@/db/schema";
import { marked } from "marked";
import {
  appendBackTaxesCtaHtml,
  appendBackTaxesCtaMarkdown,
} from "@/lib/content/back-taxes-cta";
import { embedYouTubeLinksInHtml } from "@/lib/media/youtube";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import { resolveArticleContentMarkdown } from "@/lib/content/resolve-article-content-markdown";
import { regionContentFilter } from "@/lib/local-news/region-content-filter";
import { getLocalNewsRegionBySlug } from "@/lib/local-news/regions";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const VENTURA_REGION = getLocalNewsRegionBySlug("ventura-county")!;
const MAX_LEGACY_LIST = 50;

/** Same publish rules as /ventura-county. */
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

const publishDateSort = sql`coalesce(${articles.publishedAt}, ${articles.publishAt})`;

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

export type VenturaPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

const summarySelect = {
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
  authorAlias: sql<string | null>`coalesce(
    nullif(${articles.seo}->>'authorName', ''),
    nullif(${authUser.aliasFullName}, ''),
    nullif(${users.aliasFullName}, '')
  )`,
  /** Prefer byline/alias — same display name as /ventura-county. */
  authorName: sql<string>`coalesce(
    nullif(${articles.seo}->>'authorName', ''),
    nullif(${authUser.aliasFullName}, ''),
    nullif(${authUser.name}, ''),
    nullif(${users.aliasFullName}, ''),
    nullif(${users.name}, ''),
    'Joe Knows Staff'
  )`,
  authorAvatarUrl: users.avatarUrl,
};

/**
 * Partner Ventura articles list — same selection as
 * https://www.kindjoe.com/ventura-county (Ventura desk only, not LA / SLO).
 */
export async function listVenturaArticleSummaries(): Promise<VenturaArticleSummary[]> {
  const now = new Date();

  return db
    .select(summarySelect)
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(authUser, eq(authUser.id, articles.authorId))
    .where(and(regionContentFilter(VENTURA_REGION), publishedFilter(now)))
    .orderBy(desc(publishDateSort))
    .limit(MAX_LEGACY_LIST);
}

export async function listVenturaArticleSummariesPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<VenturaPage<VenturaArticleSummary>> {
  const now = new Date();
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);

  const rows = await db
    .select(summarySelect)
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(authUser, eq(authUser.id, articles.authorId))
    .where(and(regionContentFilter(VENTURA_REGION), publishedFilter(now)))
    .orderBy(desc(publishDateSort))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    hasMore,
    nextOffset: offset + items.length,
    limit,
    offset,
  };
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
  contentMarkdown: string | null;
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
      authorAlias: sql<string | null>`coalesce(
        nullif(${articles.seo}->>'authorName', ''),
        nullif(${authUser.aliasFullName}, ''),
        nullif(${users.aliasFullName}, '')
      )`,
      authorName: sql<string>`coalesce(
        nullif(${articles.seo}->>'authorName', ''),
        nullif(${authUser.aliasFullName}, ''),
        nullif(${authUser.name}, ''),
        nullif(${users.aliasFullName}, ''),
        nullif(${users.name}, ''),
        'Joe Knows Staff'
      )`,
      authorAvatar: users.avatarUrl,
      contentMarkdown: articles.contentMarkdown,
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
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(authUser, eq(authUser.id, articles.authorId))
    .where(
      and(
        eq(articles.slug, slug),
        regionContentFilter(VENTURA_REGION),
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

  const contentSources = {
    contentMarkdown: article.contentMarkdown,
    content: article.content,
    contentHtml: article.contentHtml,
  };
  const resolvedMarkdown = resolveArticleContentMarkdown(contentSources);
  const contentMarkdown = appendBackTaxesCtaMarkdown(resolvedMarkdown ?? "");
  const storedHtml = article.contentHtml?.trim() ?? "";
  const renderedMarkdown = resolvedMarkdown
    ? embedYouTubeLinksInHtml(
        marked.parse(normalizeArticleMarkdown(resolvedMarkdown), {
          async: false,
        }) as string,
      )
    : "";
  const contentHtml = appendBackTaxesCtaHtml(storedHtml || renderedMarkdown);

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
    contentMarkdown,
    contentHtml,
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
