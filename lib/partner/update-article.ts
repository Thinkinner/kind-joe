import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
} from "@/db/schema";
import { countWordsFromHtml, slugify } from "@/lib/helpers/articles";
import { inferCanonicalRegionTagSlugs } from "@/lib/local-news/regions";
import { saveArticleTaxonomy } from "@/lib/partner/save-taxonomy";

const MIN_SUMMARY_WORDS_FOR_PUBLISH = 12;
const MIN_META_DESCRIPTION_CHARS = 70;

export type PartnerUpdateArticleInput = {
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
  /** Rename the public slug. Must be unique. */
  newSlug?: string;
  isDraft?: boolean;
};

export type PartnerUpdateArticleResult = {
  articleId: string;
  slug: string;
  articleUrl: string;
};

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

function validateUpdateInput(input: PartnerUpdateArticleInput) {
  if (input.excerpt !== undefined) {
    const summaryWordCount = countWordsFromHtml(input.excerpt);
    if (!input.excerpt.trim() || summaryWordCount < MIN_SUMMARY_WORDS_FOR_PUBLISH) {
      throw new Error(
        `Excerpt must be at least ${MIN_SUMMARY_WORDS_FOR_PUBLISH} words.`,
      );
    }
  }

  if (input.contentMarkdown !== undefined && !input.contentMarkdown.trim()) {
    throw new Error("contentMarkdown cannot be empty.");
  }

  if (input.seo?.description !== undefined) {
    const seoDescription = input.seo.description.trim();
    if (!seoDescription || seoDescription.length < MIN_META_DESCRIPTION_CHARS) {
      throw new Error(
        `Meta description must be at least ${MIN_META_DESCRIPTION_CHARS} characters.`,
      );
    }
  }
}

export async function updatePartnerArticle(
  slugOrId: string,
  input: PartnerUpdateArticleInput,
): Promise<PartnerUpdateArticleResult> {
  validateUpdateInput(input);

  const hasField =
    input.title !== undefined ||
    input.excerpt !== undefined ||
    input.contentMarkdown !== undefined ||
    input.coverImageUrl !== undefined ||
    input.category !== undefined ||
    input.tags !== undefined ||
    input.seo !== undefined ||
    input.newSlug !== undefined ||
    input.isDraft !== undefined;

  if (!hasField) {
    throw new Error("Send at least one field to update.");
  }

  const lookup = slugOrId.trim();
  const slugKey = slugify(lookup) || lookup;

  const [bySlug] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      seo: articles.seo,
      category: articles.category,
    })
    .from(articles)
    .where(and(isNull(articles.deletedAt), eq(articles.slug, slugKey)))
    .limit(1);

  let row = bySlug;
  if (!row) {
    const [byId] = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        seo: articles.seo,
        category: articles.category,
      })
      .from(articles)
      .where(and(isNull(articles.deletedAt), eq(articles.id, lookup)))
      .limit(1);
    row = byId;
  }

  if (!row) {
    throw new Error("ARTICLE_NOT_FOUND");
  }

  let nextSlug = row.slug;
  if (input.newSlug !== undefined) {
    const normalized = slugify(input.newSlug);
    if (!normalized) throw new Error("Invalid newSlug.");
    if (normalized !== row.slug) {
      const conflicts = await db
        .select({ id: articles.id })
        .from(articles)
        .where(and(eq(articles.slug, normalized), isNull(articles.deletedAt)))
        .limit(1);
      if (conflicts.length > 0) throw new Error("SLUG_CONFLICT");
      nextSlug = normalized;
    }
  }

  const patch: Partial<typeof articles.$inferInsert> = {};

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
  if (input.isDraft !== undefined) {
    patch.isDraft = input.isDraft;
  }
  if (input.newSlug !== undefined) {
    patch.slug = nextSlug;
  }

  if (input.seo !== undefined) {
    const currentSeo =
      row.seo && typeof row.seo === "object" && !Array.isArray(row.seo)
        ? ({ ...(row.seo as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const nextTitle = input.title?.trim() || row.title;
    const nextExcerpt = input.excerpt?.trim() || row.excerpt;
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

  if (Object.keys(patch).length > 0) {
    await db.update(articles).set(patch).where(eq(articles.id, row.id));
  }

  if (input.category !== undefined || input.tags !== undefined) {
    const categoryName =
      input.category?.trim() || row.category || "General";
    const tags = [...(input.tags ?? [])];
    for (const slug of inferCanonicalRegionTagSlugs({
      category: categoryName,
      tags,
    })) {
      if (!tags.some((t) => slugify(t) === slug)) tags.push(slug);
    }

    if (input.tags !== undefined) {
      await db.delete(articleTags).where(eq(articleTags.articleId, row.id));
    }
    if (input.category !== undefined) {
      await db
        .delete(articleCategories)
        .where(eq(articleCategories.articleId, row.id));
    }
    await saveArticleTaxonomy(row.id, categoryName, tags);
  }

  const siteBase = siteBaseUrl();
  const articleUrl = `${siteBase}/${nextSlug}`;

  revalidatePath(`/${nextSlug}`);
  if (nextSlug !== row.slug) {
    revalidatePath(`/${row.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/oxnard-news");
  revalidatePath("/ventura-county");
  revalidatePath("/la-news");
  revalidatePath("/san-luis-obispo");

  return {
    articleId: row.id,
    slug: nextSlug,
    articleUrl,
  };
}
