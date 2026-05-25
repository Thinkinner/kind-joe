import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";

import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
  categories,
  posts,
  tags as tagsTable,
  users,
  venturaPosts,
} from "@/db/schema";
import { saveArticleTaxonomy } from "@/lib/partner/save-taxonomy";
import {
  calcReadingMinutesFromHtml,
  countWordsFromHtml,
  slugify,
} from "@/lib/helpers/articles";
import { syncArticleEmbeddingByArticleId } from "@/lib/recommendations/article-related";
import { postImmediateArticleComment } from "@/lib/automation/article-immediate-comment";

const MIN_SUMMARY_WORDS_FOR_PUBLISH = 12;
const MIN_META_DESCRIPTION_CHARS = 70;
const EXCLUDED_AUTHOR_IDS = ["rss-auto-writer", "system-ai"];

export type PartnerPublishInput = {
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  category?: string;
  tags?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    sourceUrl?: string;
    sourceName?: string;
    sourceType?: string;
    sourceArticleId?: number;
  };
  postCard: {
    imageUrl: string;
    caption?: string;
  };
  isVentura?: boolean;
};

export type PartnerPublishResult = {
  articleId: string;
  slug: string;
  articleUrl: string;
  destinationUrl: string;
  postId: number;
  feed: "ventura" | "kindjoe";
  authorId: string;
};

function newArticleId(): string {
  return randomBytes(10).toString("hex").slice(0, 20);
}

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://www.kindjoe.com"
  ).replace(/\/$/, "");
}

function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/[`*_>#-]/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function resolveVentura(input: PartnerPublishInput): boolean {
  if (input.isVentura === true) return true;
  if (input.isVentura === false) return false;
  const category = (input.category ?? "").toLowerCase();
  if (category.includes("ventura")) return true;
  return (input.tags ?? []).some((tag) => tag.toLowerCase().includes("ventura"));
}

function normalizeTags(input: PartnerPublishInput, isVentura: boolean): string[] {
  const tags = [...(input.tags ?? [])];
  if (isVentura && !tags.some((t) => slugify(t) === "ventura-county")) {
    tags.push("ventura-county");
  }
  return tags;
}

async function pickRandomAuthorId(): Promise<string> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.role, "Writer"), eq(users.role, "Editor")));

  const eligible = rows.filter((row) => !EXCLUDED_AUTHOR_IDS.includes(row.id));
  if (eligible.length === 0) {
    const fallback = await db.select({ id: users.id }).from(users).limit(20);
    const pool = fallback.filter((row) => !EXCLUDED_AUTHOR_IDS.includes(row.id));
    if (pool.length === 0) {
      throw new Error("No CMS authors available for publish.");
    }
    return pool[Math.floor(Math.random() * pool.length)]!.id;
  }

  return eligible[Math.floor(Math.random() * eligible.length)]!.id;
}

function validatePublishInput(input: PartnerPublishInput) {
  const seoDescription = (input.seo?.description ?? "").trim();
  const summaryWordCount = countWordsFromHtml(input.excerpt);

  if (!seoDescription || seoDescription.length < MIN_META_DESCRIPTION_CHARS) {
    throw new Error(
      `Meta description must be at least ${MIN_META_DESCRIPTION_CHARS} characters.`,
    );
  }

  if (!input.excerpt?.trim() || summaryWordCount < MIN_SUMMARY_WORDS_FOR_PUBLISH) {
    throw new Error(
      `Excerpt must be at least ${MIN_SUMMARY_WORDS_FOR_PUBLISH} words.`,
    );
  }

  if (!input.contentMarkdown?.trim()) {
    throw new Error("contentMarkdown is required.");
  }

  if (!input.postCard.imageUrl?.trim()) {
    throw new Error("postCard.imageUrl is required.");
  }
}

export async function publishPartnerBundle(
  input: PartnerPublishInput,
): Promise<PartnerPublishResult> {
  validatePublishInput(input);

  const normalizedSlug = slugify(input.slug);
  if (!normalizedSlug) {
    throw new Error("Invalid slug.");
  }

  const isVentura = resolveVentura(input);
  const tags = normalizeTags(input, isVentura);
  const authorId = await pickRandomAuthorId();
  const now = new Date();
  const articleId = newArticleId();
  const siteBase = siteBaseUrl();
  const destinationUrl = isVentura
    ? `${siteBase}/ventura/${normalizedSlug}`
    : `${siteBase}/${normalizedSlug}`;
  const articleUrl = destinationUrl;

  const seoPayload: Record<string, unknown> = {
    ...(input.seo ?? {}),
    title: input.seo?.title?.trim() || input.title,
    description: input.seo?.description?.trim() || input.excerpt,
  };

  if (input.seo?.keywords?.length) {
    seoPayload.keywords = input.seo.keywords;
  }
  if (input.seo?.sourceUrl) seoPayload.sourceUrl = input.seo.sourceUrl;
  if (input.seo?.sourceName) seoPayload.sourceName = input.seo.sourceName;
  if (input.seo?.sourceType) seoPayload.sourceType = input.seo.sourceType;
  if (input.seo?.sourceArticleId != null) {
    seoPayload.sourceArticleId = input.seo.sourceArticleId;
  }

  const readingMinutes = estimateReadingMinutes(input.contentMarkdown);
  const coverImageUrl = input.coverImageUrl?.trim() || null;

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: articles.id, deletedAt: articles.deletedAt })
      .from(articles)
      .where(eq(articles.slug, normalizedSlug));
    const activeConflict = existing.some((row) => row.deletedAt == null);
    if (activeConflict) {
      throw new Error("SLUG_CONFLICT");
    }

    await tx.insert(articles).values({
      id: articleId,
      slug: normalizedSlug,
      title: input.title,
      excerpt: input.excerpt,
      coverImageUrl,
      category: input.category ?? "General",
      authorId,
      publishedAt: now,
      publishAt: null,
      publishedBy: authorId,
      readingMinutes,
      isDraft: false,
      seo: seoPayload,
      content: { type: "doc", content: [] },
      contentMarkdown: input.contentMarkdown,
      contentHtml: null,
    });
  });

  await saveArticleTaxonomy(articleId, input.category ?? "General", tags);

  const [postRow] = isVentura
    ? await db
        .insert(venturaPosts)
        .values({
          imageUrl: input.postCard.imageUrl.trim(),
          destinationUrl,
          caption: input.postCard.caption?.trim() || null,
          isPinned: false,
          order: 0,
          isActive: true,
        })
        .returning({ id: venturaPosts.id })
    : await db
        .insert(posts)
        .values({
          imageUrl: input.postCard.imageUrl.trim(),
          destinationUrl,
          caption: input.postCard.caption?.trim() || null,
          isPinned: false,
          order: 0,
          isActive: true,
        })
        .returning({ id: posts.id });

  if (!postRow) {
    throw new Error("Failed to create post card.");
  }

  try {
    await syncArticleEmbeddingByArticleId(articleId);
  } catch (error) {
    console.error("[partner.publish] embedding sync failed", error);
  }

  try {
    await postImmediateArticleComment({ articleId, now });
  } catch (error) {
    console.error("[partner.publish] immediate comment failed", error);
  }

  for (const path of ["/posts", "/ventura/posts", "/joeknowsla/posts"]) {
    revalidatePath(path);
  }

  return {
    articleId,
    slug: normalizedSlug,
    articleUrl,
    destinationUrl,
    postId: postRow.id,
    feed: isVentura ? "ventura" : "kindjoe",
    authorId,
  };
}
