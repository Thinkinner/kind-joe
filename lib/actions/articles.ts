"use server";

import { cache } from "react";
import { db } from "@/db";
import {
  articles,
  users,
  articleCategories,
  categories,
  tags,
  articleTags,
} from "@/db/schema";
import { user as authUser } from "@/db/auth-schema";
import {
  and,
  eq,
  isNull,
  isNotNull,
  lte,
  or,
  ne,
  desc,
  ilike,
  exists,
  sql,
  inArray,
} from "drizzle-orm";
import { ArticleSummary } from "@/types/article";
import { TOPIC_SLUGS, type TopicSlug } from "@/lib/content/topics";
import { resolveArticleContentMarkdown } from "@/lib/content/resolve-article-content-markdown";
import { titleAttentionScore } from "@/lib/format/title-attention-score";
import {
  getLocalNewsRegionBySlug,
  getRegionMatchKeywords,
  getRegionTagSlugs,
  LOCAL_NEWS_REGIONS,
  type LocalNewsRegion,
  type LocalNewsTagSlug,
} from "@/lib/local-news/regions";

const MAX_LIST_PAGE = 50;
const TOP_STORY_TAG_SLUG = "kindjoetopstories";
const SIDEBAR_POOL_LIMIT = 72;
const LATEST_FEED_EXCLUDE_COUNT = 9;

function publishedArticlesFilter(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    or(
      and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
      and(
        isNull(articles.publishedAt),
        isNotNull(articles.publishAt),
        lte(articles.publishAt, now),
      ),
    ),
  );
}

const articleSummarySelect = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  coverImageUrl: articles.coverImageUrl,
  category: articles.category,
  publishedAt: articles.publishedAt,
  readingMinutes: articles.readingMinutes,
  authorName: sql<string | null>`coalesce(
    nullif(${articles.seo}->>'authorName', ''),
    nullif(${authUser.aliasFullName}, ''),
    nullif(${authUser.name}, ''),
    nullif(${users.aliasFullName}, ''),
    ${users.name}
  )`,
  authorAvatarUrl: users.avatarUrl,
  tags: sql<unknown[]>`COALESCE(
    (SELECT json_agg(t.*)
     FROM ${articleTags} at
     INNER JOIN ${tags} t ON at.tag_id = t.id
     WHERE at.article_id = ${articles.id}),
    '[]'
  )`,
};

function mapArticleSummaryRows(
  results: Array<{
    publishedAt: Date | null;
    authorName: string | null;
    authorAvatarUrl: string | null;
    readingMinutes: number | null;
    [key: string]: unknown;
  }>,
): ArticleSummary[] {
  return results.map((a) => ({
    ...(a as ArticleSummary),
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    authorName: a.authorName ?? "KindJoe Staff",
    authorAvatarUrl: a.authorAvatarUrl ?? null,
    readingMinutes: a.readingMinutes ?? 0,
  }));
}
const TOPIC_KEYWORDS: Record<TopicSlug, string[]> = {
  tech: ["tech", "technology", "ai", "crypto", "web3"],
  politics: ["politic", "government", "election", "policy"],
  business: ["business", "finance", "econom", "market"],
  opinion: ["opinion", "analysis", "editorial", "commentary"],
};

const publishDateSort = sql`coalesce(${articles.publishedAt}, ${articles.publishAt})`;

function topicFilter(topic: TopicSlug) {
  const keywords = TOPIC_KEYWORDS[topic];
  return or(
    ...keywords.map((kw) => ilike(articles.category, `%${kw}%`)),
    exists(
      db
        .select()
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(
          and(
            eq(articleCategories.articleId, articles.id),
            or(
              ...keywords.map((kw) => ilike(categories.name, `%${kw}%`)),
              ...keywords.map((kw) => ilike(categories.slug, `%${kw}%`)),
            ),
          ),
        ),
    ),
    exists(
      db
        .select()
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(
          and(
            eq(articleTags.articleId, articles.id),
            or(
              ...keywords.map((kw) => ilike(tags.name, `%${kw}%`)),
              ...keywords.map((kw) => ilike(tags.slug, `%${kw}%`)),
            ),
          ),
        ),
    ),
  );
}

export async function getArticlesAction(limit: number, offset: number) {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const safeOffset = Math.max(offset, 0);
  const now = new Date();
  try {
    const results = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        publishedAt: articles.publishedAt,
        // 🧠 These were missing:
        readingMinutes: articles.readingMinutes,
        authorName: sql<string | null>`coalesce(
          nullif(${articles.seo}->>'authorName', ''),
          nullif(${authUser.aliasFullName}, ''),
          nullif(${authUser.name}, ''),
          nullif(${users.aliasFullName}, ''),
          ${users.name}
        )`,
        authorAvatarUrl: users.avatarUrl,
        // Tags grouping
        tags: sql<unknown[]>`COALESCE(
          (SELECT json_agg(t.*) 
           FROM ${articleTags} at 
           INNER JOIN ${tags} t ON at.tag_id = t.id 
           WHERE at.article_id = ${articles.id}), 
          '[]'
        )`,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id)) // 👈 Join the users table
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(
        and(
          eq(articles.isDraft, false),
          isNull(articles.deletedAt),
          or(
            and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
            and(
              isNull(articles.publishedAt),
              isNotNull(articles.publishAt),
              lte(articles.publishAt, now),
            ),
          ),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(safeLimit)
      .offset(safeOffset);

    // Map the results to match ArticleSummary strictly
    return results.map((a) => ({
      ...a,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      authorName: a.authorName ?? "KindJoe Staff",
      authorAvatarUrl: a.authorAvatarUrl ?? null,
      readingMinutes: a.readingMinutes ?? 0,
    }));
  } catch (error) {
    console.error("Action Error:", error);
    return [];
  }
}

/** Ensure Ventura / L.A. / SLO tags exist so editors can attach them immediately. */
export async function ensureLocalNewsTags(): Promise<void> {
  try {
    for (const region of LOCAL_NEWS_REGIONS) {
      for (const tagSlug of region.tagSlugs) {
        const name =
          tagSlug === "slo"
            ? "SLO"
            : tagSlug === "sanluisobispo"
              ? "SanLuisObispo"
              : region.name;
        await db
          .insert(tags)
          .values({ name, slug: tagSlug })
          .onConflictDoUpdate({
            target: tags.slug,
            set: { name },
          });
      }
    }
  } catch (error) {
    console.error("ensureLocalNewsTags failed:", error);
  }
}

/**
 * Match region content the way /ventura-county already did: category column,
 * linked categories, and tags — not only the canonical region tag slug.
 * Newer stories often land as category "Ventura County" without the tag.
 */
function regionContentFilter(region: LocalNewsRegion) {
  const keywords = getRegionMatchKeywords(region);
  const matchSlugs = getRegionTagSlugs(region);
  const keywordMatchers = keywords.flatMap((kw) => [
    ilike(articles.category, `%${kw}%`),
    exists(
      db
        .select()
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(
          and(
            eq(articleCategories.articleId, articles.id),
            or(
              ilike(categories.name, `%${kw}%`),
              ilike(categories.slug, `%${kw}%`),
            ),
          ),
        ),
    ),
    exists(
      db
        .select()
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(
          and(
            eq(articleTags.articleId, articles.id),
            or(ilike(tags.name, `%${kw}%`), ilike(tags.slug, `%${kw}%`)),
          ),
        ),
    ),
  ]);

  return or(
    ...keywordMatchers,
    exists(
      db
        .select()
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(
          and(
            eq(articleTags.articleId, articles.id),
            inArray(tags.slug, matchSlugs),
          ),
        ),
    ),
  );
}

function anyLocalNewsContentFilter() {
  return or(...LOCAL_NEWS_REGIONS.map((region) => regionContentFilter(region)));
}

/** Published articles for a local-news region (tag, category, or aliases). */
export async function getArticlesByTagSlugAction(
  tagSlug: LocalNewsTagSlug | string,
  limit: number,
  offset: number,
): Promise<ArticleSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const safeOffset = Math.max(offset, 0);
  const now = new Date();
  const region = getLocalNewsRegionBySlug(tagSlug);
  const contentFilter = region
    ? regionContentFilter(region)
    : exists(
        db
          .select()
          .from(articleTags)
          .innerJoin(tags, eq(articleTags.tagId, tags.id))
          .where(
            and(
              eq(articleTags.articleId, articles.id),
              eq(tags.slug, tagSlug),
            ),
          ),
      );

  try {
    const results = await db
      .select(articleSummarySelect)
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(and(publishedArticlesFilter(now), contentFilter))
      .orderBy(desc(publishDateSort))
      .limit(safeLimit)
      .offset(safeOffset);

    return mapArticleSummaryRows(results);
  } catch (error) {
    console.error("getArticlesByTagSlugAction error:", error);
    return [];
  }
}

/** Any local-news region (Ventura, L.A., SLO) via tag or category. */
export async function getLocalNewsArticlesAction(
  limit: number,
  offset: number,
): Promise<ArticleSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const safeOffset = Math.max(offset, 0);
  const now = new Date();

  try {
    const results = await db
      .select(articleSummarySelect)
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(and(publishedArticlesFilter(now), anyLocalNewsContentFilter()))
      .orderBy(desc(publishDateSort))
      .limit(safeLimit)
      .offset(safeOffset);

    return mapArticleSummaryRows(results);
  } catch (error) {
    console.error("getLocalNewsArticlesAction error:", error);
    return [];
  }
}

function excludingHeroTopStoriesFilter() {
  return sql`NOT EXISTS (
    SELECT 1 FROM ${articleTags} at
    INNER JOIN ${tags} t ON t.id = at.tag_id
    WHERE at.article_id = ${articles.id}
    AND t.slug = ${TOP_STORY_TAG_SLUG}
  )`;
}

async function fetchEditorsPickPool(
  now: Date,
  excludeTopStories: boolean,
) {
  const conditions = [publishedArticlesFilter(now)];
  if (excludeTopStories) {
    conditions.push(excludingHeroTopStoriesFilter());
  }

  const poolResults = await db
    .select(articleSummarySelect)
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .leftJoin(authUser, eq(articles.authorId, authUser.id))
    .where(and(...conditions))
    .orderBy(desc(publishDateSort))
    .limit(SIDEBAR_POOL_LIMIT);

  return mapArticleSummaryRows(poolResults);
}

/** Sidebar: strongest recent headlines, excluding hero top stories + first Latest grid page. */
export async function getEditorsPicksAction(limit = 5): Promise<ArticleSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const now = new Date();

  try {
    const latestBatch = await getArticlesAction(LATEST_FEED_EXCLUDE_COUNT, 0);
    const excludeIds = new Set(latestBatch.map((article) => article.id));

    let pool = (await fetchEditorsPickPool(now, true)).filter(
      (article) => !excludeIds.has(article.id),
    );

    if (pool.length === 0) {
      pool = (await fetchEditorsPickPool(now, false)).filter(
        (article) => !excludeIds.has(article.id),
      );
    }

    const ranked = pool
      .map((article) => ({
        article,
        score: titleAttentionScore(article.title),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const bTime = b.article.publishedAt
          ? new Date(b.article.publishedAt).getTime()
          : 0;
        const aTime = a.article.publishedAt
          ? new Date(a.article.publishedAt).getTime()
          : 0;
        return bTime - aTime;
      });

    let picks = ranked.slice(0, safeLimit).map((entry) => entry.article);

    if (picks.length < safeLimit) {
      const pickedIds = new Set(picks.map((article) => article.id));
      const backfill = pool
        .filter(
          (article) =>
            !pickedIds.has(article.id) && !excludeIds.has(article.id),
        )
        .slice(0, safeLimit - picks.length);
      picks = [...picks, ...backfill];
    }

    if (picks.length === 0) {
      return getArticlesAction(safeLimit, LATEST_FEED_EXCLUDE_COUNT);
    }

    return picks;
  } catch (error) {
    console.error("Editors picks action error:", error);
    try {
      return await getArticlesAction(safeLimit, LATEST_FEED_EXCLUDE_COUNT);
    } catch {
      return [];
    }
  }
}

export async function getArticlesByTopicAction(
  limit: number,
  offset: number,
  topic: TopicSlug,
): Promise<ArticleSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const safeOffset = Math.max(offset, 0);
  const now = new Date();
  if (!TOPIC_SLUGS.includes(topic)) return [];

  try {
    const results = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        publishedAt: articles.publishedAt,
        readingMinutes: articles.readingMinutes,
        authorName: sql<string | null>`coalesce(
          nullif(${articles.seo}->>'authorName', ''),
          nullif(${authUser.aliasFullName}, ''),
          nullif(${authUser.name}, ''),
          nullif(${users.aliasFullName}, ''),
          ${users.name}
        )`,
        authorAvatarUrl: users.avatarUrl,
        tags: sql<unknown[]>`COALESCE(
          (SELECT json_agg(t.*)
           FROM ${articleTags} at
           INNER JOIN ${tags} t ON at.tag_id = t.id
           WHERE at.article_id = ${articles.id}),
          '[]'
        )`,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(
        and(
          eq(articles.isDraft, false),
          isNull(articles.deletedAt),
          or(
            and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
            and(
              isNull(articles.publishedAt),
              isNotNull(articles.publishAt),
              lte(articles.publishAt, now),
            ),
          ),
          topicFilter(topic),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(safeLimit)
      .offset(safeOffset);

    return results.map((a) => ({
      ...a,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      authorName: a.authorName ?? "KindJoe Staff",
      authorAvatarUrl: a.authorAvatarUrl ?? null,
      readingMinutes: a.readingMinutes ?? 0,
    }));
  } catch (error) {
    console.error("Topic Action Error:", error);
    return [];
  }
}

const publishedFilter = (slug: string, now = new Date()) =>
  and(
    eq(articles.slug, slug),
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    or(
      and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
      and(
        isNull(articles.publishedAt),
        isNotNull(articles.publishAt),
        lte(articles.publishAt, now),
      ),
    ),
  );

function isMissingContentMarkdownColumnError(error: unknown): boolean {
  const maybe = error as { message?: string; cause?: { code?: string; message?: string } };
  const directMessage = String(maybe?.message ?? "").toLowerCase();
  const causeCode = String(maybe?.cause?.code ?? "");
  const causeMessage = String(maybe?.cause?.message ?? "").toLowerCase();
  return (
    causeCode === "42703" &&
    (directMessage.includes("content_markdown") ||
      causeMessage.includes("content_markdown"))
  );
}

export const getFullArticleBySlug = cache(async function getFullArticleBySlug(slug: string) {
  const now = new Date();
  const baseSelect = {
    article: {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      category: articles.category,
      predictionId: articles.predictionId,
      content: articles.content,
      contentHtml: articles.contentHtml,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      readingMinutes: articles.readingMinutes,
      isDraft: articles.isDraft,
    },
    authorAlias: sql<string | null>`coalesce(
      nullif(${authUser.aliasFullName}, ''),
      nullif(${users.aliasFullName}, '')
    )`,
    authorProfileName: sql<string | null>`coalesce(
      nullif(${authUser.name}, ''),
      ${users.name}
    )`,
    authorName: sql<string | null>`coalesce(
      nullif(${articles.seo}->>'authorName', ''),
      nullif(${authUser.aliasFullName}, ''),
      nullif(${authUser.name}, ''),
      nullif(${users.aliasFullName}, ''),
      ${users.name}
    )`,
    authorAvatar: users.avatarUrl,
    seo: articles.seo,
    tags: sql<{ id: number; name: string; slug: string }[]>`COALESCE(
      (SELECT json_agg(t.*)
       FROM ${articleTags} at
       INNER JOIN ${tags} t ON at.tag_id = t.id
       WHERE at.article_id = ${articles.id}),
      '[]'
    )`,
  } as const;

  let row: Array<{
    article: (typeof baseSelect)["article"];
    contentMarkdown: string | null;
    authorAlias: string | null;
    authorProfileName: string | null;
    authorName: string | null;
    authorAvatar: string | null;
    seo: unknown;
    tags: { id: number; name: string; slug: string }[];
  }>;

  try {
    row = await db
      .select({
        ...baseSelect,
        contentMarkdown: articles.contentMarkdown,
      })
      .from(articles)
      .leftJoin(users, eq(users.id, articles.authorId))
      .leftJoin(authUser, eq(authUser.id, articles.authorId))
      .where(publishedFilter(slug, now))
      .limit(1);
  } catch (error) {
    if (!isMissingContentMarkdownColumnError(error)) throw error;
    row = await db
      .select({
        ...baseSelect,
        contentMarkdown: sql<string | null>`null`,
      })
      .from(articles)
      .leftJoin(users, eq(users.id, articles.authorId))
      .leftJoin(authUser, eq(authUser.id, articles.authorId))
      .where(publishedFilter(slug, now))
      .limit(1);
  }

  if (!row[0]) return null;

  const contentSources = {
    contentMarkdown: row[0].contentMarkdown,
    content: row[0].article.content,
    contentHtml: row[0].article.contentHtml,
  };
  const resolvedMarkdown = resolveArticleContentMarkdown(contentSources);

  return {
    article: row[0].article,
    contentMarkdown: resolvedMarkdown,
    rawContentMarkdown: row[0].contentMarkdown,
    contentSources,
    authorAlias: row[0].authorAlias,
    authorProfileName: row[0].authorProfileName,
    authorName: row[0].authorName,
    authorAvatar: row[0].authorAvatar,
    seo: row[0].seo,
    tags: row[0].tags, // Now explicitly returned
  };
});

export async function getArticleCategories(articleId: string) {
  return await db
    .select({ name: categories.name, slug: categories.slug })
    .from(articleCategories)
    .leftJoin(categories, eq(categories.id, articleCategories.categoryId))
    .where(eq(articleCategories.articleId, articleId));
}

export async function getRecommendedArticles(
  excludeId: string,
  currentCategory: string | null,
  limit = 4,
) {
  try {
    const results = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        publishedAt: articles.publishedAt,
        readingMinutes: articles.readingMinutes,
        authorName: sql<string | null>`coalesce(
          nullif(${articles.seo}->>'authorName', ''),
          nullif(${authUser.aliasFullName}, ''),
          nullif(${authUser.name}, ''),
          nullif(${users.aliasFullName}, ''),
          ${users.name}
        )`,
        authorAvatarUrl: users.avatarUrl,
        // 🧠 Smart Branding: Fetch tags so the card knows if it's Ventura or KindJoe
        tags: sql<unknown[]>`COALESCE(
          (SELECT json_agg(t.*) 
           FROM ${articleTags} at 
           INNER JOIN ${tags} t ON at.tag_id = t.id 
           WHERE at.article_id = ${articles.id}), 
          '[]'
        )`,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(
        and(
          ne(articles.id, excludeId), // Don't recommend the current article
          eq(articles.isDraft, false), // Only published
          isNull(articles.deletedAt), // Not deleted
        ),
      )
      // 🧠 SMART SORTING:
      // 1. Articles in the same category come first
      // 2. Then sort by most recent
      .orderBy(
        sql`CASE WHEN ${articles.category} = ${currentCategory} THEN 0 ELSE 1 END`,
        desc(articles.publishedAt),
      )
      .limit(limit);

    return results.map((a) => ({
      ...a,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      authorName: a.authorName ?? "KindJoe Staff",
      authorAvatarUrl: a.authorAvatarUrl ?? null,
      readingMinutes: a.readingMinutes ?? 0,
    }));
  } catch (error) {
    console.error("Recommended Action Error:", error);
    return [];
  }
}

export async function getVenturaArticlesAction(
  limit: number,
  offset: number,
): Promise<ArticleSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIST_PAGE);
  const safeOffset = Math.max(offset, 0);
  const now = new Date();
  const ventura = getLocalNewsRegionBySlug("ventura-county");
  if (!ventura) return [];

  try {
    const results = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        category: articles.category,
        publishedAt: articles.publishedAt,
        readingMinutes: articles.readingMinutes,
        authorName: sql<string | null>`coalesce(
          nullif(${articles.seo}->>'authorName', ''),
          nullif(${authUser.aliasFullName}, ''),
          nullif(${authUser.name}, ''),
          nullif(${users.aliasFullName}, ''),
          ${users.name}
        )`,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(authUser, eq(articles.authorId, authUser.id))
      .where(and(publishedArticlesFilter(now), regionContentFilter(ventura)))
      .orderBy(desc(publishDateSort))
      .limit(safeLimit)
      .offset(safeOffset);

    return results.map((a) => ({
      ...a,
      publishedAt: a.publishedAt?.toISOString() || null,
      authorName: a.authorName ?? "Joe Knows Staff",
      authorAvatarUrl: null,
      tags: [],
      readingMinutes: a.readingMinutes ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching Ventura articles:", error);
    return [];
  }
}
