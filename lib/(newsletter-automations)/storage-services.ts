"use server";

import { randomBytes } from "crypto";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
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

async function assertStaff() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) throw new Error("Unauthorized");
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
    );

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

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  await assertStaff();
  try {
    const [draft] = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, draftId))
      .limit(1);

    const [settingsRow] = await db.select().from(settingsTable).limit(1);

    if (!draft) throw new Error("Draft not found");
    const authorId = settingsRow?.authorId?.trim();
    if (!authorId) {
      throw new Error(
        "Set Database Author ID in Newsletter settings (Better Auth user id).",
      );
    }

    const newsletterArticles = draft.articles || [];
    if (newsletterArticles.length === 0) {
      throw new Error("No articles to publish.");
    }

    const result = await db.transaction(async (tx) => {
      const authorHit = await tx
        .select({ id: cmsUsers.id })
        .from(cmsUsers)
        .where(eq(cmsUsers.id, authorId))
        .limit(1);
      if (!authorHit[0]) {
        await tx.insert(cmsUsers).values({
          id: authorId,
          name: "Newsletter author",
          role: "Writer",
        });
      }

      let publishedCount = 0;

      for (const item of newsletterArticles) {
        let finalSlug = createSlug(item.title);
        if (!finalSlug) finalSlug = `article-${Date.now()}`;
        finalSlug = finalSlug.slice(0, 200);

        const keywords = [...(item.seo?.keywords || [])];
        if (item.category) keywords.push(item.category);
        keywords.push("kindjoetopstories");
        const uniqueTags = Array.from(new Set(keywords.map((k) => String(k))));

        const contentJson =
          item.content && typeof item.content === "object"
            ? item.content
            : htmlToMinimalTiptapDoc(item.contentHtml || item.excerpt || "");

        const existing = await tx
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.slug, finalSlug))
          .limit(1);

        let articleId: string;
        if (existing[0]) {
          articleId = existing[0].id;
          await tx
            .update(articles)
            .set({
              title: item.title,
              excerpt: item.excerpt || "",
              coverImageUrl: item.coverImageUrl || null,
              category: item.category || "General",
              authorId,
              content: contentJson as object,
              contentHtml: item.contentHtml || "",
              seo: {
                title: item.seo?.title || item.title,
                description: item.seo?.description || item.excerpt || "",
                keywords: uniqueTags,
              },
              readingMinutes: item.readingMinutes || 3,
              isDraft: false,
              publishedAt: new Date(),
              updatedAt: new Date(),
              publishedBy: authorId,
              deletedAt: null,
            })
            .where(eq(articles.id, articleId));
        } else {
          articleId = newArticleId();
          await tx.insert(articles).values({
            id: articleId,
            slug: finalSlug,
            title: item.title,
            excerpt: item.excerpt || "",
            coverImageUrl: item.coverImageUrl || null,
            category: item.category || "General",
            authorId,
            content: contentJson as object,
            contentHtml: item.contentHtml || "",
            seo: {
              title: item.seo?.title || item.title,
              description: item.seo?.description || item.excerpt || "",
              keywords: uniqueTags,
            },
            readingMinutes: item.readingMinutes || 3,
            isDraft: false,
            publishedAt: new Date(),
            updatedAt: new Date(),
            publishedBy: authorId,
          });
        }

        await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));

        for (const tagName of uniqueTags) {
          const tagSlug = createSlug(tagName);
          if (!tagSlug) continue;

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
      }

      await tx
        .update(draftsTable)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(draftsTable.id, draftId));

      return { success: true as const, count: publishedCount };
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
