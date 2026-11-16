import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, like, or } from "drizzle-orm";

import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
  posts,
  users,
  venturaPosts,
} from "@/db/schema";
import { saveArticleTaxonomy } from "@/lib/partner/save-taxonomy";
import { countWordsFromHtml, slugify } from "@/lib/helpers/articles";
import { inferCanonicalRegionTagSlugs } from "@/lib/local-news/regions";
import { scheduleArticlePostPublishWork } from "@/lib/articles/schedule-post-publish-work";

const MIN_SUMMARY_WORDS_FOR_PUBLISH = 12;
const MIN_META_DESCRIPTION_CHARS = 70;
const EXCLUDED_AUTHOR_IDS = ["rss-auto-writer", "system-ai"];

export type PartnerPublishInput = {
  slug: string;
  title?: string;
  excerpt?: string;
  contentMarkdown?: string;
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
  postCard?: {
    imageUrl?: string;
    caption?: string;
  };
  isVentura?: boolean;
};

export type PartnerPublishResult = {
  articleId: string;
  slug: string;
  articleUrl: string;
  destinationUrl: string;
  postId: number | null;
  feed: "ventura" | "kindjoe";
  authorId: string;
  created: boolean;
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

function normalizeTags(
  input: PartnerPublishInput,
  isVentura: boolean,
): string[] {
  const tags = [...(input.tags ?? [])];
  if (isVentura && !tags.some((t) => slugify(t) === "ventura-county")) {
    tags.push("ventura-county");
  }
  for (const regionSlug of inferCanonicalRegionTagSlugs({
    category: input.category,
    tags,
  })) {
    if (!tags.some((t) => slugify(t) === regionSlug)) {
      tags.push(regionSlug);
    }
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

function validateCreateInput(input: PartnerPublishInput) {
  if (!input.title?.trim()) {
    throw new Error("title is required.");
  }
  if (!input.excerpt?.trim()) {
    throw new Error("excerpt is required.");
  }
  if (!input.contentMarkdown?.trim()) {
    throw new Error("contentMarkdown is required.");
  }
  if (!input.postCard?.imageUrl?.trim()) {
    throw new Error("postCard.imageUrl is required.");
  }

  const seoDescription = (input.seo?.description ?? "").trim();
  const summaryWordCount = countWordsFromHtml(input.excerpt);

  if (!seoDescription || seoDescription.length < MIN_META_DESCRIPTION_CHARS) {
    throw new Error(
      `seo.description must be at least ${MIN_META_DESCRIPTION_CHARS} characters.`,
    );
  }

  if (summaryWordCount < MIN_SUMMARY_WORDS_FOR_PUBLISH) {
    throw new Error(
      `excerpt must be at least ${MIN_SUMMARY_WORDS_FOR_PUBLISH} words.`,
    );
  }
}

function validatePartialUpdateInput(input: PartnerPublishInput) {
  if (input.excerpt !== undefined) {
    if (!input.excerpt.trim()) throw new Error("excerpt cannot be empty.");
    if (countWordsFromHtml(input.excerpt) < MIN_SUMMARY_WORDS_FOR_PUBLISH) {
      throw new Error(
        `excerpt must be at least ${MIN_SUMMARY_WORDS_FOR_PUBLISH} words.`,
      );
    }
  }
  if (input.contentMarkdown !== undefined && !input.contentMarkdown.trim()) {
    throw new Error("contentMarkdown cannot be empty.");
  }
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("title cannot be empty.");
  }
  if (input.seo?.description !== undefined) {
    const seoDescription = input.seo.description.trim();
    if (!seoDescription || seoDescription.length < MIN_META_DESCRIPTION_CHARS) {
      throw new Error(
        `seo.description must be at least ${MIN_META_DESCRIPTION_CHARS} characters.`,
      );
    }
  }
  if (
    input.postCard !== undefined &&
    input.postCard.imageUrl !== undefined &&
    !input.postCard.imageUrl.trim()
  ) {
    throw new Error("postCard.imageUrl cannot be empty.");
  }
}

function revalidateArticleSurfaces(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/oxnard-news");
  revalidatePath("/ventura-county");
  revalidatePath("/la-news");
  revalidatePath("/san-luis-obispo");
  for (const path of [
    "/posts",
    "/ventura/posts",
    "/joeknowsla/posts",
    "/joefromslo/posts",
    "/oxnard/posts",
  ]) {
    revalidatePath(path);
  }
}

async function upsertPostCard(params: {
  isVentura: boolean;
  destinationUrl: string;
  slug: string;
  imageUrl?: string;
  caption?: string;
}): Promise<number | null> {
  const { isVentura, destinationUrl, slug, imageUrl, caption } = params;
  if (!imageUrl?.trim() && caption === undefined) return null;

  const venturaExisting = await db
    .select({ id: venturaPosts.id })
    .from(venturaPosts)
    .where(
      or(
        eq(venturaPosts.destinationUrl, destinationUrl),
        like(venturaPosts.destinationUrl, `%/${slug}`),
      ),
    )
    .limit(1);

  if (venturaExisting[0]) {
    const patch: Partial<typeof venturaPosts.$inferInsert> = {};
    if (imageUrl?.trim()) patch.imageUrl = imageUrl.trim();
    if (caption !== undefined) patch.caption = caption.trim() || null;
    if (Object.keys(patch).length > 0) {
      await db
        .update(venturaPosts)
        .set(patch)
        .where(eq(venturaPosts.id, venturaExisting[0].id));
    }
    return venturaExisting[0].id;
  }

  const kindjoeExisting = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      or(
        eq(posts.destinationUrl, destinationUrl),
        like(posts.destinationUrl, `%/${slug}`),
      ),
    )
    .limit(1);

  if (kindjoeExisting[0]) {
    const patch: Partial<typeof posts.$inferInsert> = {};
    if (imageUrl?.trim()) patch.imageUrl = imageUrl.trim();
    if (caption !== undefined) patch.caption = caption.trim() || null;
    if (Object.keys(patch).length > 0) {
      await db.update(posts).set(patch).where(eq(posts.id, kindjoeExisting[0].id));
    }
    return kindjoeExisting[0].id;
  }

  if (!imageUrl?.trim()) return null;

  if (isVentura) {
    const [row] = await db
      .insert(venturaPosts)
      .values({
        imageUrl: imageUrl.trim(),
        destinationUrl,
        caption: caption?.trim() || null,
        isPinned: false,
        order: 0,
        isActive: true,
      })
      .returning({ id: venturaPosts.id });
    return row?.id ?? null;
  }

  const [row] = await db
    .insert(posts)
    .values({
      imageUrl: imageUrl.trim(),
      destinationUrl,
      caption: caption?.trim() || null,
      isPinned: false,
      order: 0,
      isActive: true,
    })
    .returning({ id: posts.id });
  return row?.id ?? null;
}

async function updateExistingArticle(
  existing: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    seo: unknown;
    category: string | null;
    authorId: string;
  },
  input: PartnerPublishInput,
  normalizedSlug: string,
): Promise<PartnerPublishResult> {
  validatePartialUpdateInput(input);

  const now = new Date();
  const siteBase = siteBaseUrl();
  const destinationUrl = `${siteBase}/${normalizedSlug}`;
  // Title may change; slug/URL never changes on upsert update.
  const articleUrl = destinationUrl;

  const isVentura = resolveVentura({
    ...input,
    category: input.category ?? existing.category ?? undefined,
    tags: input.tags,
  });

  const patch: Partial<typeof articles.$inferInsert> = {
    updatedAt: now,
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt.trim();
  if (input.contentMarkdown !== undefined) {
    patch.contentMarkdown = input.contentMarkdown;
    patch.contentHtml = null;
    patch.readingMinutes = estimateReadingMinutes(input.contentMarkdown);
  }
  if (input.coverImageUrl !== undefined) {
    patch.coverImageUrl = input.coverImageUrl?.trim() || null;
  }
  if (input.category !== undefined) {
    patch.category = input.category.trim() || "General";
  }

  if (input.seo !== undefined) {
    const currentSeo =
      existing.seo && typeof existing.seo === "object" && !Array.isArray(existing.seo)
        ? ({ ...(existing.seo as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const nextTitle = input.title?.trim() || existing.title;
    const nextExcerpt = input.excerpt?.trim() || existing.excerpt || "";
    if (input.seo.title !== undefined) {
      currentSeo.title = input.seo.title.trim() || nextTitle;
    }
    if (input.seo.description !== undefined) {
      currentSeo.description = input.seo.description.trim() || nextExcerpt;
    }
    if (input.seo.keywords !== undefined) {
      currentSeo.keywords = input.seo.keywords;
    }
    if (input.seo.sourceUrl !== undefined) {
      currentSeo.sourceUrl = input.seo.sourceUrl;
    }
    if (input.seo.sourceName !== undefined) {
      currentSeo.sourceName = input.seo.sourceName;
    }
    if (input.seo.sourceType !== undefined) {
      currentSeo.sourceType = input.seo.sourceType;
    }
    if (input.seo.sourceArticleId !== undefined) {
      currentSeo.sourceArticleId = input.seo.sourceArticleId;
    }
    patch.seo = currentSeo;
  }

  await db.update(articles).set(patch).where(eq(articles.id, existing.id));

  if (input.category !== undefined || input.tags !== undefined) {
    const categoryName =
      input.category?.trim() || existing.category || "General";

    if (input.tags !== undefined) {
      const tags = normalizeTags(
        {
          ...input,
          category: categoryName,
          tags: input.tags,
        },
        isVentura,
      );
      await db.delete(articleTags).where(eq(articleTags.articleId, existing.id));
      if (input.category !== undefined) {
        await db
          .delete(articleCategories)
          .where(eq(articleCategories.articleId, existing.id));
      }
      await saveArticleTaxonomy(existing.id, categoryName, tags);
    } else if (input.category !== undefined) {
      await db
        .delete(articleCategories)
        .where(eq(articleCategories.articleId, existing.id));
      await saveArticleTaxonomy(existing.id, categoryName, []);
    }
  } else if (input.isVentura === true) {
    await saveArticleTaxonomy(
      existing.id,
      existing.category || "General",
      ["ventura-county"],
    );
  }

  const postId = await upsertPostCard({
    isVentura,
    destinationUrl,
    slug: normalizedSlug,
    imageUrl: input.postCard?.imageUrl,
    caption: input.postCard?.caption,
  });

  revalidateArticleSurfaces(normalizedSlug);

  return {
    articleId: existing.id,
    slug: normalizedSlug,
    articleUrl,
    destinationUrl,
    postId,
    feed: isVentura ? "ventura" : "kindjoe",
    authorId: existing.authorId,
    created: false,
  };
}

async function createArticle(
  input: PartnerPublishInput,
  normalizedSlug: string,
): Promise<PartnerPublishResult> {
  validateCreateInput(input);

  const isVentura = resolveVentura(input);
  const tags = normalizeTags(input, isVentura);
  const authorId = await pickRandomAuthorId();
  const now = new Date();
  const articleId = newArticleId();
  const siteBase = siteBaseUrl();
  const destinationUrl = `${siteBase}/${normalizedSlug}`;
  const articleUrl = destinationUrl;

  const title = input.title!.trim();
  const excerpt = input.excerpt!.trim();
  const contentMarkdown = input.contentMarkdown!;

  const seoPayload: Record<string, unknown> = {
    ...(input.seo ?? {}),
    title: input.seo?.title?.trim() || title,
    description: input.seo?.description?.trim() || excerpt,
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

  const readingMinutes = estimateReadingMinutes(contentMarkdown);
  const coverImageUrl = input.coverImageUrl?.trim() || null;

  await db.insert(articles).values({
    id: articleId,
    slug: normalizedSlug,
    title,
    excerpt,
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
    contentMarkdown,
    contentHtml: null,
    updatedAt: now,
  });

  await saveArticleTaxonomy(articleId, input.category ?? "General", tags);

  const postId = await upsertPostCard({
    isVentura,
    destinationUrl,
    slug: normalizedSlug,
    imageUrl: input.postCard!.imageUrl!,
    caption: input.postCard?.caption,
  });

  if (postId == null) {
    throw new Error("Failed to create post card.");
  }

  scheduleArticlePostPublishWork({
    articleId,
    now,
    logLabel: "partner.publish",
  });

  revalidateArticleSurfaces(normalizedSlug);

  return {
    articleId,
    slug: normalizedSlug,
    articleUrl,
    destinationUrl,
    postId,
    feed: isVentura ? "ventura" : "kindjoe",
    authorId,
    created: true,
  };
}

/**
 * Upsert by slug:
 * - new slug → create (201)
 * - existing slug (any article, CMS or partner) → update in place (200)
 * Title changes never rename the slug/URL. publishedAt is preserved; updatedAt is bumped.
 */
export async function publishPartnerBundle(
  input: PartnerPublishInput,
): Promise<PartnerPublishResult> {
  const normalizedSlug = slugify(input.slug);
  if (!normalizedSlug) {
    throw new Error("Invalid slug.");
  }

  const [existing] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      seo: articles.seo,
      category: articles.category,
      authorId: articles.authorId,
    })
    .from(articles)
    .where(and(eq(articles.slug, normalizedSlug), isNull(articles.deletedAt)))
    .limit(1);

  if (existing) {
    return updateExistingArticle(existing, input, normalizedSlug);
  }

  return createArticle(input, normalizedSlug);
}
