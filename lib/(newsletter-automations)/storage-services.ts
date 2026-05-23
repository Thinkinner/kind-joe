"use server";

import { randomBytes } from "crypto";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  draftsTable,
  settingsTable,
  aiAutomationRssSources,
  articles,
  tags,
  articleTags,
  users as cmsUsers,
  newsRssArticles,
  newsRssSource,
} from "@/db/schema";
import type {
  AppSettings,
  NewsletterDraft,
  DbArticle,
  RssSource,
  RawRssItem,
} from "@/lib/(newsletter-automations)/types";
import { NEWSLETTER_INGEST_FRESH_HOURS } from "@/lib/(newsletter-automations)/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { slugify } from "@/lib/helpers/articles";

async function assertStaff() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) throw new Error("Unauthorized");
  return staff;
}

function newsletterIngestCutoff(): Date {
  return new Date(
    Date.now() - NEWSLETTER_INGEST_FRESH_HOURS * 60 * 60 * 1000,
  );
}

function mapNewsRssRowToRawItem(row: {
  title: string;
  link: string;
  imageUrl: string | null;
  contentSnippet: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  sourceName: string;
}): RawRssItem {
  const when = row.publishedAt ?? row.createdAt;
  return {
    title: row.title,
    link: row.link,
    pubDate: when.toISOString(),
    contentSnippet: row.contentSnippet ?? "",
    content: row.contentSnippet ?? "",
    imageUrl: row.imageUrl ?? undefined,
    sourceName: row.sourceName,
  };
}

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.kindjoe.com"
  );
}

function mapCmsArticleRowToRawItem(row: {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): RawRssItem {
  const when = row.publishedAt ?? row.updatedAt;
  return {
    title: row.title,
    link: `${siteBaseUrl()}/${row.slug}`,
    pubDate: when.toISOString(),
    contentSnippet: row.excerpt ?? "",
    content: row.excerpt ?? "",
    imageUrl: row.coverImageUrl ?? undefined,
    sourceName: "KindJoe DB",
  };
}

/** Rows in `news_rss_articles` from enabled sources, newer than the cutoff (publish time, else ingest time). */
export async function getNewsletterFreshIngestSummary(): Promise<{
  count: number;
  freshHours: number;
}> {
  await assertStaff();
  const cutoff = newsletterIngestCutoff();
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(
      and(
        eq(newsRssSource.enabled, true),
        gte(
          sql`coalesce(${newsRssArticles.publishedAt}, ${newsRssArticles.createdAt})`,
          cutoff,
        ),
      ),
    );
  return {
    count: Number(row?.c ?? 0),
    freshHours: NEWSLETTER_INGEST_FRESH_HOURS,
  };
}

export async function getFreshNewsRssArticlesForNewsletter(): Promise<
  RawRssItem[]
> {
  await assertStaff();
  const cutoff = newsletterIngestCutoff();
  const rows = await db
    .select({
      title: newsRssArticles.title,
      link: newsRssArticles.link,
      imageUrl: newsRssArticles.imageUrl,
      contentSnippet: newsRssArticles.contentSnippet,
      publishedAt: newsRssArticles.publishedAt,
      createdAt: newsRssArticles.createdAt,
      sourceName: newsRssSource.name,
    })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(
      and(
        eq(newsRssSource.enabled, true),
        gte(
          sql`coalesce(${newsRssArticles.publishedAt}, ${newsRssArticles.createdAt})`,
          cutoff,
        ),
      ),
    )
    .orderBy(
      desc(
        sql`coalesce(${newsRssArticles.publishedAt}, ${newsRssArticles.createdAt})`,
      ),
    )
    .limit(200);

  return rows.map(mapNewsRssRowToRawItem);
}

/**
 * Selection pool for manual story replacement in review UI.
 * Returns latest ingested rows (enabled sources), not constrained by fresh-hour cutoff.
 */
export async function getNewsRssArticlesForNewsletterSelection(
  limit = 300,
): Promise<RawRssItem[]> {
  await assertStaff();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(1000, Math.floor(limit))) : 300;

  const rows = await db
    .select({
      title: newsRssArticles.title,
      link: newsRssArticles.link,
      imageUrl: newsRssArticles.imageUrl,
      contentSnippet: newsRssArticles.contentSnippet,
      publishedAt: newsRssArticles.publishedAt,
      createdAt: newsRssArticles.createdAt,
      sourceName: newsRssSource.name,
    })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(eq(newsRssSource.enabled, true))
    .orderBy(
      desc(
        sql`coalesce(${newsRssArticles.publishedAt}, ${newsRssArticles.createdAt})`,
      ),
    )
    .limit(safeLimit);

  return rows.map(mapNewsRssRowToRawItem);
}

/**
 * Published CMS articles for manual story replacement in review UI.
 */
export async function getDbArticlesForNewsletterSelection(
  limit = 200,
): Promise<RawRssItem[]> {
  await assertStaff();
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(500, Math.floor(limit)))
    : 200;

  const rows = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(eq(articles.isDraft, false), isNull(articles.deletedAt)))
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.updatedAt})`))
    .limit(safeLimit);

  return rows.map(mapCmsArticleRowToRawItem);
}

const NEWSLETTER_FEATURED_TAG = "kindjoetopstories";
const MAX_SLUG_ATTEMPTS = 4;

function normalizeNewsletterTagEntries(
  keywords: unknown[],
  category?: string | null,
): Array<{ name: string; slug: string }> {
  const rawValues = [...keywords];
  if (typeof category === "string" && category.trim()) {
    rawValues.push(category);
  }
  rawValues.push(NEWSLETTER_FEATURED_TAG);

  const bySlug = new Map<string, { name: string; slug: string }>();
  for (const value of rawValues) {
    const name = String(value ?? "").trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    if (slug === NEWSLETTER_FEATURED_TAG) {
      bySlug.set(NEWSLETTER_FEATURED_TAG, {
        name: NEWSLETTER_FEATURED_TAG,
        slug: NEWSLETTER_FEATURED_TAG,
      });
      continue;
    }
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { name, slug });
    }
  }

  if (!bySlug.has(NEWSLETTER_FEATURED_TAG)) {
    bySlug.set(NEWSLETTER_FEATURED_TAG, {
      name: NEWSLETTER_FEATURED_TAG,
      slug: NEWSLETTER_FEATURED_TAG,
    });
  }

  return Array.from(bySlug.values());
}

function htmlToMinimalTiptapDoc(html: string): { type: "doc"; content: unknown[] } {
  const stripped = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: stripped || " " }],
      },
    ],
  };
}

function newArticleId(): string {
  return randomBytes(12).toString("hex").slice(0, 24);
}

export const publishNewsletterToArticles = async (draftId: string) => {
  const staff = await assertStaff();
  try {
    const [draft] = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, draftId))
      .limit(1);

    if (!draft) throw new Error("Draft not found");
    if (draft.status === "sent") {
      throw new Error("This newsletter was already published.");
    }
    const publisherId = staff.user.id;
    const authorId = publisherId;
    const publisherName =
      staff.user.aliasFullName?.trim() ||
      staff.user.name?.trim() ||
      staff.user.email?.trim() ||
      "Newsletter publisher";

    const newsletterArticles = draft.articles || [];
    if (newsletterArticles.length === 0) {
      throw new Error("No articles to publish.");
    }
    const incompleteCount = newsletterArticles.filter((item) => {
      const titleOk = typeof item?.title === "string" && item.title.trim().length > 0;
      const markdownOk =
        typeof item?.contentMarkdown === "string" && item.contentMarkdown.trim().length >= 50;
      return !titleOk || !markdownOk;
    }).length;
    if (incompleteCount > 0) {
      throw new Error(
        `Cannot publish yet. ${incompleteCount} article slot${incompleteCount === 1 ? "" : "s"} still missing generated content.`,
      );
    }

    const result = await db.transaction(async (tx) => {
      const publisherHit = await tx
        .select({ id: cmsUsers.id })
        .from(cmsUsers)
        .where(eq(cmsUsers.id, publisherId))
        .limit(1);
      if (!publisherHit[0]) {
        await tx.insert(cmsUsers).values({
          id: publisherId,
          name: publisherName,
          role: "Writer",
        });
      }

      let publishedCount = 0;
      const publishedRows: Array<{
        index: number;
        id: string;
        slug: string;
        title: string;
      }> = [];

      for (let index = 0; index < newsletterArticles.length; index++) {
        const item = newsletterArticles[index];
        const articleId = newArticleId();
        const baseSlug = (slugify(item.title) || `article-${Date.now()}`).slice(0, 200);
        let finalSlug = baseSlug;
        for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
          const existing = await tx
            .select({ id: articles.id })
            .from(articles)
            .where(eq(articles.slug, finalSlug))
            .limit(1);
          if (!existing[0]) break;
          finalSlug = `${baseSlug}-${attempt + 2}`.slice(0, 200);
        }

        const normalizedTags = normalizeNewsletterTagEntries(
          Array.isArray(item.seo?.keywords) ? item.seo.keywords : [],
          item.category,
        );
        const seoKeywords = normalizedTags.map((tag) => tag.name);

        await tx.insert(articles).values({
          id: articleId,
          slug: finalSlug,
          title: item.title,
          excerpt: item.excerpt || "",
          coverImageUrl: item.coverImageUrl || null,
          category: item.category || "General",
          authorId,
          contentMarkdown: item.contentMarkdown,
          seo: {
            title: item.seo?.title || item.title,
            description: item.seo?.description || item.excerpt || "",
            keywords: seoKeywords,
          },
          readingMinutes: item.readingMinutes || 3,
          isDraft: false,
          publishedAt: new Date(),
          updatedAt: new Date(),
          publishedBy: publisherId,
        });

        for (const tagEntry of normalizedTags) {
          const tagName = tagEntry.name;
          const tagSlug = tagEntry.slug;

          await tx
            .insert(tags)
            .values({ name: tagName, slug: tagSlug })
            .onConflictDoNothing({ target: tags.slug });

          const [dbTag] = await tx
            .select()
            .from(tags)
            .where(eq(tags.slug, tagSlug))
            .limit(1);

          if (dbTag) {
            await tx.insert(articleTags).values({
              articleId,
              tagId: dbTag.id,
            });
          }
        }

        publishedCount++;
        publishedRows.push({
          index,
          id: articleId,
          slug: finalSlug,
          title: item.title,
        });
      }

      await tx
        .update(draftsTable)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(draftsTable.id, draftId));

      return {
        success: true as const,
        count: publishedCount,
        published: publishedRows,
      };
    });

    return result;
  } catch (error: unknown) {
    console.error("Publishing Failed:", error);
    const message = error instanceof Error ? error.message : "Publish failed";
    return { success: false as const, error: message };
  }
};

export const getDrafts = async (): Promise<NewsletterDraft[]> => {
  await assertStaff();
  try {
    const drafts = await db
      .select()
      .from(draftsTable)
      .orderBy(desc(draftsTable.updatedAt));

    return drafts.map((d) => ({
      id: d.id,
      status: d.status as NewsletterDraft["status"],
      createdAt: d.createdAt.getTime(),
      data: d.data,
      articles: d.articles || [],
    }));
  } catch (error) {
    console.error("DB Error fetching drafts:", error);
    return [];
  }
};

export const getDraftById = async (
  id: string,
): Promise<NewsletterDraft | null> => {
  await assertStaff();
  const { loadNewsletterDraftById } = await import(
    "@/lib/(newsletter-automations)/newsletter-draft-loader"
  );
  return loadNewsletterDraftById(id);
};

export const saveDraft = async (draft: NewsletterDraft) => {
  await assertStaff();
  try {
    const existing = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, draft.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(draftsTable)
        .set({
          status: draft.status,
          data: draft.data,
          articles: draft.articles ?? [],
          updatedAt: new Date(),
        })
        .where(eq(draftsTable.id, draft.id));
    } else {
      await db.insert(draftsTable).values({
        id: draft.id,
        status: draft.status,
        data: draft.data,
        articles: draft.articles ?? [],
      });
    }
    return { success: true as const };
  } catch (error) {
    console.error("DB Error saving draft:", error);
    return { success: false as const, error };
  }
};

export const deleteDraft = async (id: string) => {
  await assertStaff();
  try {
    await db.delete(draftsTable).where(eq(draftsTable.id, id));
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error };
  }
};

export const clearDraftArticlesForRegeneration = async (id: string) => {
  await assertStaff();
  try {
    const [updated] = await db
      .update(draftsTable)
      .set({
        status: "draft",
        articles: [],
        updatedAt: new Date(),
      })
      .where(eq(draftsTable.id, id))
      .returning({ id: draftsTable.id });
    if (!updated) {
      return { success: false as const, error: "Draft not found" };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error };
  }
};

export const getPublishedArticlesForDraft = async (draftId: string) => {
  await assertStaff();
  try {
    const [draft] = await db
      .select({ articles: draftsTable.articles })
      .from(draftsTable)
      .where(eq(draftsTable.id, draftId))
      .limit(1);
    if (!draft) return [];

    const rawArticles = Array.isArray(draft.articles) ? draft.articles : [];
    const titles = Array.from(
      new Set(
        rawArticles
          .map((item) =>
            item && typeof item === "object" && "title" in item
              ? String((item as Record<string, unknown>).title ?? "").trim()
              : "",
          )
          .filter(Boolean),
      ),
    );
    if (titles.length === 0) return [];

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
      .innerJoin(tags, eq(tags.id, articleTags.tagId))
      .where(
        and(
          inArray(articles.title, titles),
          eq(tags.slug, NEWSLETTER_FEATURED_TAG),
          isNull(articles.deletedAt),
        ),
      )
      .orderBy(desc(articles.updatedAt));

    const uniqueById = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!uniqueById.has(row.id)) uniqueById.set(row.id, row);
    }
    const deduped = Array.from(uniqueById.values());
    const titleCounts = deduped.reduce(
      (acc, row) => {
        acc[row.title] = (acc[row.title] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return deduped.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      duplicateCount: titleCounts[row.title] ?? 1,
      isDuplicate: (titleCounts[row.title] ?? 1) > 1,
    }));
  } catch (error) {
    console.error("Failed to load published newsletter articles", error);
    return [];
  }
};

export const deletePublishedNewsletterArticle = async (articleId: string) => {
  await assertStaff();
  try {
    const [row] = await db
      .select({ id: articles.id, slug: articles.slug })
      .from(articles)
      .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
      .innerJoin(tags, eq(tags.id, articleTags.tagId))
      .where(
        and(
          eq(articles.id, articleId),
          eq(tags.slug, NEWSLETTER_FEATURED_TAG),
          isNull(articles.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return { success: false as const, error: "Article not found" };

    const recycledSlug = `${row.slug}--archived-newsletter-${row.id.slice(0, 6)}`.slice(
      0,
      200,
    );
    await db
      .update(articles)
      .set({
        slug: recycledSlug,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, row.id));

    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete published newsletter article", error);
    return { success: false as const, error };
  }
};

const mapDbSettingsToType = (dbRecord: {
  webhookUrl: string | null;
  authorId: string | null;
  cloudinaryCloudName: string | null;
  cloudinaryApiKey: string | null;
  cloudinaryApiSecret: string | null;
  cloudinaryUploadPreset: string | null;
  ghlApiKey: string | null;
  ghlLocationId: string | null;
}): AppSettings => ({
  webhookUrl: dbRecord.webhookUrl || "",
  authorId: dbRecord.authorId || "",
  cloudinaryCloudName: dbRecord.cloudinaryCloudName || "",
  cloudinaryApiKey: dbRecord.cloudinaryApiKey || "",
  cloudinaryApiSecret: dbRecord.cloudinaryApiSecret || "",
  cloudinaryUploadPreset: dbRecord.cloudinaryUploadPreset || "",
  ghlApiKey: dbRecord.ghlApiKey || "",
  ghlLocationId: dbRecord.ghlLocationId || "",
});

export const getSettings = async (): Promise<AppSettings> => {
  await assertStaff();
  try {
    const rows = await db.select().from(settingsTable).limit(1);

    if (rows.length === 0) {
      const [created] = await db
        .insert(settingsTable)
        .values({
          webhookUrl: "",
          authorId: "",
        })
        .returning();
      return mapDbSettingsToType(created);
    }

    return mapDbSettingsToType(rows[0]);
  } catch (error) {
    console.error("DB Error fetching settings:", error);
    return {
      webhookUrl: "",
      authorId: "",
      cloudinaryCloudName: "",
      cloudinaryApiKey: "",
      cloudinaryApiSecret: "",
      cloudinaryUploadPreset: "",
      ghlApiKey: "",
      ghlLocationId: "",
    };
  }
};

export const saveSettings = async (settings: AppSettings) => {
  await assertStaff();
  try {
    const rows = await db.select().from(settingsTable).limit(1);

    if (rows.length > 0) {
      await db
        .update(settingsTable)
        .set({
          webhookUrl: settings.webhookUrl,
          authorId: settings.authorId,
          cloudinaryCloudName: settings.cloudinaryCloudName,
          cloudinaryApiKey: settings.cloudinaryApiKey,
          cloudinaryApiSecret: settings.cloudinaryApiSecret,
          cloudinaryUploadPreset: settings.cloudinaryUploadPreset,
          ghlApiKey: settings.ghlApiKey,
          ghlLocationId: settings.ghlLocationId,
          updatedAt: new Date(),
        })
        .where(eq(settingsTable.id, rows[0].id));
    } else {
      await db.insert(settingsTable).values({
        webhookUrl: settings.webhookUrl,
        authorId: settings.authorId,
        cloudinaryCloudName: settings.cloudinaryCloudName,
        cloudinaryApiKey: settings.cloudinaryApiKey,
        cloudinaryApiSecret: settings.cloudinaryApiSecret,
        cloudinaryUploadPreset: settings.cloudinaryUploadPreset,
        ghlApiKey: settings.ghlApiKey,
        ghlLocationId: settings.ghlLocationId,
      });
    }
    return { success: true as const };
  } catch (error) {
    console.error("DB Error saving settings:", error);
    return { success: false as const };
  }
};

export const getRssSources = async (): Promise<RssSource[]> => {
  await assertStaff();
  try {
    const sources = await db.select().from(aiAutomationRssSources);
    return sources.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      url: s.url,
      enabled: s.enabled ?? true,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const addRssSourceAction = async (name: string, url: string) => {
  await assertStaff();
  try {
    const result = await db
      .insert(aiAutomationRssSources)
      .values({ name, url })
      .returning();
    return { success: true as const, data: result[0] };
  } catch (error) {
    return { success: false as const, error };
  }
};

export const deleteRssSourceAction = async (id: string) => {
  await assertStaff();
  try {
    await db
      .delete(aiAutomationRssSources)
      .where(eq(aiAutomationRssSources.id, parseInt(id, 10)));
    return { success: true as const };
  } catch (error) {
    return { success: false as const };
  }
};

export const toggleRssSourceAction = async (id: string, enabled: boolean) => {
  await assertStaff();
  try {
    await db
      .update(aiAutomationRssSources)
      .set({ enabled })
      .where(eq(aiAutomationRssSources.id, parseInt(id, 10)));
    return { success: true as const };
  } catch (error) {
    return { success: false as const };
  }
};
