import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  articleCategories,
  articleEmbeddings,
  articleTags,
  articles,
  categories,
  tags,
  users,
} from "@/db/schema";
import {
  blendRelatedScore,
  cosineSimilarity,
  jaccardSimilarity,
  recencyScore,
} from "@/lib/recommendations/scoring";

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
const MAX_EMBEDDING_TEXT_CHARS = 6000;
const MAX_CANDIDATES = 250;
const MIN_SEMANTIC_SIMILARITY = 0.46;
const MIN_RELATED_SCORE = 0.4;
const RELATED_CHAIN_CACHE_SECONDS = 300;

type ArticleTopicRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  category: string | null;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  tags: string[];
  categories: string[];
};

type CandidateRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  predictionId: number | null;
  authorAvatar: string | null;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  category: string | null;
  tags: string[];
  categories: string[];
  embedding: number[] | null;
  hasVenturaTag: boolean;
};

type ScoredRelatedItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  predictionId: number | null;
  authorAvatar: string | null;
  hasVenturaTag: boolean;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  publishAt: string | null;
  category: string | null;
  score: number;
  semanticSimilarity: number;
  href: string;
};

export type RelatedChainItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  contentMarkdown: string | null;
  contentHtml: string | null;
  seo: unknown;
  predictionId: number | null;
  authorAvatar: string | null;
  hasVenturaTag: boolean;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  publishAt: string | null;
  category: string | null;
  score: number;
  semanticSimilarity: number;
  href: string;
};

export type RelatedChainResult = {
  items: RelatedChainItem[];
  hasMore: boolean;
  nextCursor: number | null;
  source: "semantic" | "fallback";
};

function normalizeList(list: string[]): string[] {
  return list
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, idx, arr) => arr.indexOf(item) === idx);
}

function publishedPredicate(now = new Date()) {
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

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTextFromRichContent(value: unknown, bucket: string[]) {
  if (!value) return;
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractTextFromRichContent(item, bucket);
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") bucket.push(record.text);
    for (const nested of Object.values(record)) {
      extractTextFromRichContent(nested, bucket);
    }
  }
}

function getRichTextPreview(content: unknown): string {
  const bucket: string[] = [];
  extractTextFromRichContent(content, bucket);
  return bucket.join(" ").replace(/\s+/g, " ").trim();
}

function buildEmbeddingSourceText(row: ArticleTopicRow): string {
  const tagsText = normalizeList(row.tags).join(", ");
  const categoriesText = normalizeList(row.categories).join(", ");
  const richText = getRichTextPreview(row.content);
  const excerpt = row.excerpt ? stripHtml(row.excerpt) : "";

  const payload = [
    `Title: ${row.title}`,
    excerpt ? `Summary: ${excerpt}` : "",
    tagsText ? `Tags: ${tagsText}` : "",
    categoriesText ? `Categories: ${categoriesText}` : "",
    richText ? `Body: ${richText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return payload.slice(0, MAX_EMBEDDING_TEXT_CHARS);
}

function hashPayload(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function parseEmbedding(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: number[] = [];
  for (const entry of value) {
    const num = typeof entry === "number" ? entry : Number(entry);
    if (!Number.isFinite(num)) return null;
    parsed.push(num);
  }
  return parsed.length > 0 ? parsed : null;
}

async function getTagMapForArticleIds(articleIds: string[]): Promise<Map<string, string[]>> {
  const uniqueIds = Array.from(new Set(articleIds.filter(Boolean)));
  const map = new Map<string, string[]>();
  if (uniqueIds.length === 0) return map;

  const rows = await db
    .select({
      articleId: articleTags.articleId,
      slug: tags.slug,
    })
    .from(articleTags)
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .where(inArray(articleTags.articleId, uniqueIds));

  for (const row of rows) {
    const list = map.get(row.articleId) ?? [];
    list.push(row.slug);
    map.set(row.articleId, list);
  }
  return map;
}

async function getCategoryMapForArticleIds(articleIds: string[]): Promise<Map<string, string[]>> {
  const uniqueIds = Array.from(new Set(articleIds.filter(Boolean)));
  const map = new Map<string, string[]>();
  if (uniqueIds.length === 0) return map;

  const rows = await db
    .select({
      articleId: articleCategories.articleId,
      slug: categories.slug,
    })
    .from(articleCategories)
    .innerJoin(categories, eq(categories.id, articleCategories.categoryId))
    .where(inArray(articleCategories.articleId, uniqueIds));

  for (const row of rows) {
    const list = map.get(row.articleId) ?? [];
    list.push(row.slug);
    map.set(row.articleId, list);
  }
  return map;
}

async function getVenturaArticleIdSet(articleIds: string[]): Promise<Set<string>> {
  const uniqueIds = Array.from(new Set(articleIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Set();

  const rows = await db
    .select({ articleId: articleTags.articleId })
    .from(articleTags)
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .where(and(inArray(articleTags.articleId, uniqueIds), eq(tags.slug, "ventura-county")));

  return new Set(rows.map((row) => row.articleId));
}

async function fetchEmbedding(payload: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: payload }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const values = parseEmbedding(data.embedding?.values ?? null);
  if (!values) {
    throw new Error("Embedding response missing vector values");
  }
  return values;
}

async function getPublishedArticleById(articleId: string): Promise<ArticleTopicRow | null> {
  const [row] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      category: articles.category,
      coverImageUrl: articles.coverImageUrl,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
    })
    .from(articles)
    .where(and(eq(articles.id, articleId), publishedPredicate()))
    .limit(1);

  if (!row) return null;

  const [tagMap, categoryMap] = await Promise.all([
    getTagMapForArticleIds([row.id]),
    getCategoryMapForArticleIds([row.id]),
  ]);

  return {
    ...row,
    tags: normalizeList(tagMap.get(row.id) ?? []),
    categories: normalizeList(categoryMap.get(row.id) ?? []),
  };
}

async function getPublishedArticleBySlug(slug: string): Promise<ArticleTopicRow | null> {
  const [row] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      category: articles.category,
      coverImageUrl: articles.coverImageUrl,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
    })
    .from(articles)
    .where(and(eq(articles.slug, slug), publishedPredicate()))
    .limit(1);

  if (!row) return null;

  const [tagMap, categoryMap] = await Promise.all([
    getTagMapForArticleIds([row.id]),
    getCategoryMapForArticleIds([row.id]),
  ]);

  return {
    ...row,
    tags: normalizeList(tagMap.get(row.id) ?? []),
    categories: normalizeList(categoryMap.get(row.id) ?? []),
  };
}

export async function removeArticleEmbedding(articleId: string) {
  await db.delete(articleEmbeddings).where(eq(articleEmbeddings.articleId, articleId));
}

export async function syncArticleEmbeddingByArticleId(
  articleId: string,
  options: { force?: boolean } = {},
): Promise<"updated" | "skipped" | "removed"> {
  const article = await getPublishedArticleById(articleId);
  if (!article) {
    await removeArticleEmbedding(articleId);
    return "removed";
  }

  const sourceText = buildEmbeddingSourceText(article);
  if (!sourceText) return "skipped";
  const sourceHash = hashPayload(sourceText);

  const [existing] = await db
    .select({
      sourceTextHash: articleEmbeddings.sourceTextHash,
      model: articleEmbeddings.model,
    })
    .from(articleEmbeddings)
    .where(eq(articleEmbeddings.articleId, articleId))
    .limit(1);

  if (
    !options.force &&
    existing &&
    existing.sourceTextHash === sourceHash &&
    existing.model === EMBEDDING_MODEL
  ) {
    return "skipped";
  }

  const embedding = await fetchEmbedding(sourceText);
  const now = new Date();
  await db
    .insert(articleEmbeddings)
    .values({
      articleId,
      model: EMBEDDING_MODEL,
      embedding,
      sourceTextHash: sourceHash,
      sourceText,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: articleEmbeddings.articleId,
      set: {
        model: EMBEDDING_MODEL,
        embedding,
        sourceTextHash: sourceHash,
        sourceText,
        updatedAt: now,
      },
    });

  return "updated";
}

async function ensureEmbedding(article: ArticleTopicRow): Promise<number[] | null> {
  const [row] = await db
    .select({
      embedding: articleEmbeddings.embedding,
      sourceTextHash: articleEmbeddings.sourceTextHash,
      model: articleEmbeddings.model,
    })
    .from(articleEmbeddings)
    .where(eq(articleEmbeddings.articleId, article.id))
    .limit(1);

  const sourceText = buildEmbeddingSourceText(article);
  const sourceHash = hashPayload(sourceText);

  if (row && row.sourceTextHash === sourceHash && row.model === EMBEDDING_MODEL) {
    return parseEmbedding(row.embedding);
  }

  try {
    await syncArticleEmbeddingByArticleId(article.id, { force: true });
  } catch (error) {
    console.error("[related-chain] failed to refresh source embedding", error);
  }

  const [updated] = await db
    .select({ embedding: articleEmbeddings.embedding })
    .from(articleEmbeddings)
    .where(eq(articleEmbeddings.articleId, article.id))
    .limit(1);
  return parseEmbedding(updated?.embedding ?? null);
}

async function getSemanticCandidates(
  sourceArticle: ArticleTopicRow,
  seenArticleIds: Set<string>,
): Promise<CandidateRow[]> {
  const seenIds = Array.from(seenArticleIds);
  const baseWhere =
    seenIds.length > 0
      ? and(
          publishedPredicate(),
          ne(articles.id, sourceArticle.id),
          not(inArray(articles.id, seenIds)),
        )
      : and(publishedPredicate(), ne(articles.id, sourceArticle.id));

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      predictionId: articles.predictionId,
      authorAvatar: users.avatarUrl,
      coverImageUrl: articles.coverImageUrl,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      category: articles.category,
      embedding: articleEmbeddings.embedding,
    })
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(articleEmbeddings, eq(articleEmbeddings.articleId, articles.id))
    .where(baseWhere)
    .orderBy(desc(articles.publishedAt), desc(articles.publishAt))
    .limit(MAX_CANDIDATES);

  const ids = rows.map((row) => row.id);
  const [tagMap, categoryMap, venturaSet] = await Promise.all([
    getTagMapForArticleIds(ids),
    getCategoryMapForArticleIds(ids),
    getVenturaArticleIdSet(ids),
  ]);

  return rows.map((row) => ({
    ...row,
    embedding: parseEmbedding(row.embedding),
    tags: normalizeList(tagMap.get(row.id) ?? []),
    categories: normalizeList(categoryMap.get(row.id) ?? []),
    hasVenturaTag: venturaSet.has(row.id),
  }));
}

async function getFallbackArticles(
  sourceArticle: ArticleTopicRow,
  seenArticleIds: Set<string>,
): Promise<ScoredRelatedItem[]> {
  const excludedIds = Array.from(new Set([...seenArticleIds, sourceArticle.id]));
  const baseWhere =
    excludedIds.length > 0
      ? and(
          publishedPredicate(),
          not(inArray(articles.id, excludedIds)),
        )
      : publishedPredicate();

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      predictionId: articles.predictionId,
      authorAvatar: users.avatarUrl,
      coverImageUrl: articles.coverImageUrl,
      readingMinutes: articles.readingMinutes,
      category: articles.category,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
    })
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(baseWhere)
    .orderBy(
      sql`case when ${articles.category} = ${sourceArticle.category} then 0 else 1 end`,
      desc(articles.publishedAt),
    )
    .limit(20);

  const venturaSet = await getVenturaArticleIdSet(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    predictionId: row.predictionId,
    authorAvatar: row.authorAvatar,
    hasVenturaTag: venturaSet.has(row.id),
    coverImageUrl: row.coverImageUrl,
    readingMinutes: row.readingMinutes,
    category: row.category,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    publishAt: row.publishAt ? row.publishAt.toISOString() : null,
    score: 0,
    semanticSimilarity: 0,
    href: `/${row.slug}`,
  }));
}

async function hydrateRelatedChainContent(
  items: ScoredRelatedItem[],
): Promise<RelatedChainItem[]> {
  if (items.length === 0) return [];

  const ids = items.map((item) => item.id);
  const contentRows = await db
    .select({
      id: articles.id,
      content: articles.content,
      contentMarkdown: articles.contentMarkdown,
      contentHtml: articles.contentHtml,
      seo: articles.seo,
    })
    .from(articles)
    .where(inArray(articles.id, ids));

  const contentById = new Map(contentRows.map((row) => [row.id, row]));

  return items.map((item) => {
    const content = contentById.get(item.id);
    return {
      ...item,
      content: content?.content ?? null,
      contentMarkdown: content?.contentMarkdown ?? null,
      contentHtml: content?.contentHtml ?? null,
      seo: content?.seo ?? null,
    };
  });
}

function rankSemanticCandidates(
  sourceEmbedding: number[],
  sourceArticle: ArticleTopicRow,
  candidates: CandidateRow[],
): ScoredRelatedItem[] {
  const sourceTags = normalizeList(sourceArticle.tags);
  const sourceCategories = normalizeList(sourceArticle.categories);
  const now = new Date();

  const ranked = candidates
    .map((candidate) => {
      const semantic = cosineSimilarity(sourceEmbedding, candidate.embedding ?? []);
      const tagOverlap = jaccardSimilarity(sourceTags, candidate.tags);
      const categoryOverlap =
        sourceCategories.length > 0
          ? jaccardSimilarity(sourceCategories, candidate.categories)
          : sourceArticle.category && candidate.category
            ? sourceArticle.category.toLowerCase() === candidate.category.toLowerCase()
              ? 1
              : 0
            : 0;
      const recency = recencyScore(candidate.publishedAt ?? candidate.publishAt, now);
      const score = blendRelatedScore({
        semanticSimilarity: semantic,
        tagOverlap,
        categoryOverlap,
        recency,
      });

      return {
        id: candidate.id,
        slug: candidate.slug,
        title: candidate.title,
        excerpt: candidate.excerpt,
        predictionId: candidate.predictionId,
        authorAvatar: candidate.authorAvatar,
        hasVenturaTag: candidate.hasVenturaTag,
        coverImageUrl: candidate.coverImageUrl,
        readingMinutes: candidate.readingMinutes,
        category: candidate.category,
        publishedAt: candidate.publishedAt ? candidate.publishedAt.toISOString() : null,
        publishAt: candidate.publishAt ? candidate.publishAt.toISOString() : null,
        score,
        semanticSimilarity: semantic,
        href: `/${candidate.slug}`,
      };
    })
    .filter(
      (item) =>
        item.semanticSimilarity >= MIN_SEMANTIC_SIMILARITY || item.score >= MIN_RELATED_SCORE,
    )
    .sort((a, b) => b.score - a.score);

  const diversityPicked: ScoredRelatedItem[] = [];
  const categoryCount = new Map<string, number>();
  for (const item of ranked) {
    const key = (item.category ?? "uncategorized").toLowerCase();
    const count = categoryCount.get(key) ?? 0;
    if (count >= 2 && diversityPicked.length < 8) continue;
    diversityPicked.push(item);
    categoryCount.set(key, count + 1);
    if (diversityPicked.length >= 40) break;
  }

  return diversityPicked;
}

type CachedRelatedRank = {
  sourceArticleId: string;
  merged: ScoredRelatedItem[];
  source: "semantic" | "fallback";
};

async function buildRankedRelatedList(slug: string): Promise<CachedRelatedRank | null> {
  const sourceArticle = await getPublishedArticleBySlug(slug);
  if (!sourceArticle) return null;

  const sourceOnlySeen = new Set([sourceArticle.id]);
  const sourceEmbedding = await ensureEmbedding(sourceArticle);

  if (!sourceEmbedding) {
    const fallbackItems = await getFallbackArticles(sourceArticle, sourceOnlySeen);
    return {
      sourceArticleId: sourceArticle.id,
      merged: fallbackItems,
      source: "fallback",
    };
  }

  const candidates = await getSemanticCandidates(sourceArticle, sourceOnlySeen);
  const ranked = rankSemanticCandidates(sourceEmbedding, sourceArticle, candidates);
  const fallbackItems = await getFallbackArticles(sourceArticle, sourceOnlySeen);

  const merged: ScoredRelatedItem[] = [...ranked];
  const seenInMerged = new Set(merged.map((item) => item.id));
  for (const item of fallbackItems) {
    if (seenInMerged.has(item.id)) continue;
    seenInMerged.add(item.id);
    merged.push(item);
  }

  return {
    sourceArticleId: sourceArticle.id,
    merged,
    source: ranked.length > 0 ? "semantic" : "fallback",
  };
}

const getCachedRankedRelatedList = unstable_cache(
  buildRankedRelatedList,
  ["related-chain-ranked"],
  { revalidate: RELATED_CHAIN_CACHE_SECONDS },
);

function pageRankedRelatedList(
  merged: ScoredRelatedItem[],
  seenIds: Set<string>,
  cursor: number,
  limit: number,
): { items: ScoredRelatedItem[]; nextCursor: number | null } {
  const page: ScoredRelatedItem[] = [];
  let idx = Math.max(0, cursor);

  while (page.length < limit && idx < merged.length) {
    const item = merged[idx];
    idx += 1;
    if (seenIds.has(item.id)) continue;
    page.push(item);
  }

  return {
    items: page,
    nextCursor: idx < merged.length ? idx : null,
  };
}

export async function getRelatedChainBySlug(input: {
  slug: string;
  seenArticleIds?: string[];
  cursor?: number;
  limit?: number;
}): Promise<RelatedChainResult | null> {
  const ranked = await getCachedRankedRelatedList(input.slug);
  if (!ranked) return null;

  const seenIds = new Set<string>((input.seenArticleIds ?? []).filter(Boolean));
  seenIds.add(ranked.sourceArticleId);

  const cursor = Math.max(0, input.cursor ?? 0);
  const limit = Math.min(Math.max(input.limit ?? 3, 1), 8);
  const { items: paged, nextCursor } = pageRankedRelatedList(
    ranked.merged,
    seenIds,
    cursor,
    limit,
  );

  return {
    items: await hydrateRelatedChainContent(paged),
    hasMore: nextCursor !== null,
    nextCursor,
    source: ranked.source,
  };
}

