"use server";

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
} from "drizzle-orm";
import { ArticleSummary } from "@/types/article";
import { TOPIC_SLUGS, type TopicSlug } from "@/lib/content/topics";

const MAX_LIST_PAGE = 50;
const TOPIC_KEYWORDS: Record<TopicSlug, string[]> = {
  tech: ["tech", "technology", "ai", "crypto", "web3"],
  politics: ["politic", "government", "election", "policy"],
  business: ["business", "finance", "econom", "market"],
  opinion: ["opinion", "analysis", "editorial", "commentary"],
};

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

export async function getFullArticleBySlug(slug: string) {
  const now = new Date();

  const row = await db
    .select({
      article: articles,
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
      // 🧠 This MUST be inside the select object
      tags: sql<{ id: number; name: string; slug: string }[]>`COALESCE(
        (SELECT json_agg(t.*) 
         FROM ${articleTags} at 
         INNER JOIN ${tags} t ON at.tag_id = t.id 
         WHERE at.article_id = ${articles.id}), 
        '[]'
      )`,
    })
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(authUser, eq(authUser.id, articles.authorId))
    .where(
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
      ),
    )
    .limit(1);

  if (!row[0]) return null;

  return {
    article: row[0].article,
    authorAlias: row[0].authorAlias,
    authorProfileName: row[0].authorProfileName,
    authorName: row[0].authorName,
    authorAvatar: row[0].authorAvatar,
    tags: row[0].tags, // Now explicitly returned
  };
}

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
      .where(
        and(
          eq(articles.isDraft, false),
          isNull(articles.deletedAt),
          // 🧠 THE SMART FILTER: Look everywhere for "Ventura"
          or(
            // 1. Check the main category column
            ilike(articles.category, "%Ventura%"),

            // 2. Check if any linked Category has "Ventura" in name or slug
            exists(
              db
                .select()
                .from(articleCategories)
                .innerJoin(
                  categories,
                  eq(articleCategories.categoryId, categories.id),
                )
                .where(
                  and(
                    eq(articleCategories.articleId, articles.id),
                    or(
                      ilike(categories.name, "%Ventura%"),
                      ilike(categories.slug, "%ventura%"),
                    ),
                  ),
                ),
            ),

            // 3. Check if any linked Tag has "Ventura" in name or slug
            exists(
              db
                .select()
                .from(articleTags)
                .innerJoin(tags, eq(articleTags.tagId, tags.id))
                .where(
                  and(
                    eq(articleTags.articleId, articles.id),
                    or(
                      ilike(tags.name, "%Ventura%"),
                      ilike(tags.slug, "%ventura%"),
                    ),
                  ),
                ),
            ),
          ),
        ),
      )
      .orderBy(desc(articles.publishedAt))
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
