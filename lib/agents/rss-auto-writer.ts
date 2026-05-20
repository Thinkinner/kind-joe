import { randomBytes } from "crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
  categories,
  newsRssArticles,
  newsRssSource,
  rssAutoWriterQueue,
  tags,
  users,
} from "@/db/schema";
import { slugify } from "@/lib/helpers/articles";
import { checkAndProbeImage } from "@/lib/rss-news/image-quality";
import { uploadImage } from "@/lib/(newsletter-automations)/cloudinary-service";
import { ARTICLE_ASSISTANT_MARKDOWN_PROMPT } from "@/lib/ai/article-assistant-prompt";
import { generateArticleAssistAll } from "@/lib/ai/article-assist-service";

const MIN_IMAGE_WIDTH = 1280;
const MIN_IMAGE_HEIGHT = 720;
const DEFAULT_INGEST_LIMIT = 30;
const MAX_SLUG_ATTEMPTS = 50;
const LOCK_STALE_MINUTES = 90;
const MAX_ATTEMPTS = 6;
const AUTO_WRITER_USER_ID = "rss-auto-writer";
const AUTO_WRITER_USER_NAME = "RSS Auto Writer";

type AutoWriterStatus =
  | "queued"
  | "writer_processed"
  | "skipped_low_quality_image"
  | "skipped_missing_image"
  | "skipped_duplicate_source"
  | "skipped_already_queued"
  | "error";

type AutoWriterItemResult = {
  phase: "ingest" | "writer";
  rssId: number;
  link: string;
  status: AutoWriterStatus;
  queueId?: string;
  articleId?: string;
  reason?: string;
};

export type RssAutoWriterSummary = {
  startedAt: string;
  finishedAt: string;
  ingestedScanned: number;
  queued: number;
  writerProcessed: number;
  skipped: number;
  failed: number;
  queueStats: {
    queued: number;
    processing: number;
    failed: number;
    done: number;
    skipped: number;
  };
  results: AutoWriterItemResult[];
};

function newArticleId(): string {
  return randomBytes(10).toString("hex").slice(0, 20);
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

function toKebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveSlugHintFromLink(link: string): string | null {
  try {
    const parsed = new URL(link);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const tail = parts[parts.length - 1] || "";
    const cleaned = toKebab(tail);
    return cleaned || null;
  } catch {
    return null;
  }
}

async function resolveAuthorId(): Promise<string> {
  const configured = (process.env.AUTO_WRITER_AUTHOR_ID || "").trim();
  if (configured) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, configured))
      .limit(1);
    if (existing[0]) return existing[0].id;
  }

  const fallback = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(desc(users.id))
    .limit(1);
  if (fallback[0]) return fallback[0].id;

  await db.insert(users).values({
    id: AUTO_WRITER_USER_ID,
    name: AUTO_WRITER_USER_NAME,
    role: "Writer",
  });
  return AUTO_WRITER_USER_ID;
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const safeBase = (baseSlug || `rss-${Date.now()}`).slice(0, 180);
  let slug = safeBase;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (!existing[0]) return slug;
    slug = `${safeBase}-${attempt + 2}`.slice(0, 200);
  }
  return `${safeBase}-${Date.now()}`.slice(0, 200);
}

async function saveTaxonomy(articleId: string, category: string, rawTags: string[]) {
  const categoryName = (category || "General").trim();
  if (categoryName) {
    const catSlug = toKebab(categoryName);
    if (catSlug) {
      await db
        .insert(categories)
        .values({ name: categoryName, slug: catSlug })
        .onConflictDoNothing({ target: categories.slug });
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, catSlug))
        .limit(1);
      if (cat) {
        await db
          .insert(articleCategories)
          .values({ articleId, categoryId: cat.id })
          .onConflictDoNothing({
            target: [articleCategories.articleId, articleCategories.categoryId],
          });
      }
    }
  }

  const normalizedTags = rawTags
    .map((tag) => ({ name: tag.trim(), slug: toKebab(tag) }))
    .filter((tag) => tag.name && tag.slug)
    .slice(0, 20);

  for (const tagEntry of normalizedTags) {
    await db
      .insert(tags)
      .values({ name: tagEntry.name, slug: tagEntry.slug })
      .onConflictDoNothing({ target: tags.slug });
    const [tagRow] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, tagEntry.slug))
      .limit(1);
    if (!tagRow) continue;
    await db.insert(articleTags).values({ articleId, tagId: tagRow.id }).onConflictDoNothing({
      target: [articleTags.articleId, articleTags.tagId],
    });
  }
}

export async function runRssAutoWriter(opts?: {
  ingestLimit?: number;
}): Promise<RssAutoWriterSummary> {
  const startedAt = new Date();
  const ingestLimit = Math.min(
    Math.max(opts?.ingestLimit ?? DEFAULT_INGEST_LIMIT, 1),
    120,
  );
  const authorId = await resolveAuthorId();

  const pending = await db
    .select({
      id: newsRssArticles.id,
      title: newsRssArticles.title,
      link: newsRssArticles.link,
      imageUrl: newsRssArticles.imageUrl,
      contentSnippet: newsRssArticles.contentSnippet,
      publishedAt: newsRssArticles.publishedAt,
      sourceName: newsRssSource.name,
    })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(eq(newsRssArticles.aiProcessed, false))
    .orderBy(desc(newsRssArticles.publishedAt), desc(newsRssArticles.id))
    .limit(ingestLimit);

  const results: AutoWriterItemResult[] = [];
  let queued = 0;
  let writerProcessed = 0;
  let skipped = 0;
  let failed = 0;

  // Phase 1: ingest and enqueue.
  for (const row of pending) {
    try {
      if (!row.imageUrl?.trim()) {
        await db
          .update(newsRssArticles)
          .set({ aiProcessed: true })
          .where(eq(newsRssArticles.id, row.id));
        results.push({
          phase: "ingest",
          rssId: row.id,
          link: row.link,
          status: "skipped_missing_image",
          reason: "No image URL.",
        });
        skipped += 1;
        continue;
      }

      const probe = await checkAndProbeImage(row.imageUrl.trim());
      if (!probe.ok || probe.width < MIN_IMAGE_WIDTH || probe.height < MIN_IMAGE_HEIGHT) {
        await db
          .update(newsRssArticles)
          .set({ aiProcessed: true })
          .where(eq(newsRssArticles.id, row.id));
        results.push({
          phase: "ingest",
          rssId: row.id,
          link: row.link,
          status: "skipped_low_quality_image",
          reason: probe.ok
            ? `Image too small: ${probe.width}x${probe.height}`
            : `Image probe failed: ${probe.reason}`,
        });
        skipped += 1;
        continue;
      }

      const now = new Date();
      const inserted = await db
        .insert(rssAutoWriterQueue)
        .values({
          rssArticleId: row.id,
          sourceUrl: row.link,
          sourceName: row.sourceName,
          status: "queued",
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: rssAutoWriterQueue.rssArticleId,
        })
        .returning({ id: rssAutoWriterQueue.id });

      await db
        .update(newsRssArticles)
        .set({ aiProcessed: true })
        .where(eq(newsRssArticles.id, row.id));

      if (inserted[0]) {
        results.push({
          phase: "ingest",
          rssId: row.id,
          link: row.link,
          status: "queued",
          queueId: inserted[0].id,
        });
        queued += 1;
      } else {
        results.push({
          phase: "ingest",
          rssId: row.id,
          link: row.link,
          status: "skipped_already_queued",
        });
        skipped += 1;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      results.push({
        phase: "ingest",
        rssId: row.id,
        link: row.link,
        status: "error",
        reason,
      });
      failed += 1;
    }
  }

  // Phase 2: writer claims ONE queued item and writes one draft.
  const staleLockCutoff = new Date(
    Date.now() - LOCK_STALE_MINUTES * 60 * 1000,
  );
  const candidate = await db
    .select({
      id: rssAutoWriterQueue.id,
      rssArticleId: rssAutoWriterQueue.rssArticleId,
      sourceUrl: rssAutoWriterQueue.sourceUrl,
      sourceName: rssAutoWriterQueue.sourceName,
      status: rssAutoWriterQueue.status,
      attemptCount: rssAutoWriterQueue.attemptCount,
      lockedAt: rssAutoWriterQueue.lockedAt,
    })
    .from(rssAutoWriterQueue)
    .where(
      and(
        inArray(rssAutoWriterQueue.status, ["queued", "failed"]),
        lt(rssAutoWriterQueue.attemptCount, MAX_ATTEMPTS),
        or(
          isNull(rssAutoWriterQueue.lockedAt),
          lt(rssAutoWriterQueue.lockedAt, staleLockCutoff),
        ),
      ),
    )
    .orderBy(
      sql`case when ${rssAutoWriterQueue.status} = 'queued' then 0 else 1 end`,
      asc(rssAutoWriterQueue.createdAt),
    )
    .limit(1);

  if (candidate[0]) {
    const now = new Date();
    const claimed = await db
      .update(rssAutoWriterQueue)
      .set({
        status: "processing",
        lockedAt: now,
        attemptCount: sql`${rssAutoWriterQueue.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(rssAutoWriterQueue.id, candidate[0].id),
          eq(rssAutoWriterQueue.status, candidate[0].status),
          or(
            isNull(rssAutoWriterQueue.lockedAt),
            lt(rssAutoWriterQueue.lockedAt, staleLockCutoff),
          ),
        ),
      )
      .returning({
        id: rssAutoWriterQueue.id,
        rssArticleId: rssAutoWriterQueue.rssArticleId,
        sourceUrl: rssAutoWriterQueue.sourceUrl,
        sourceName: rssAutoWriterQueue.sourceName,
      });

    if (claimed[0]) {
      const job = claimed[0];
      const rssRows = await db
        .select({
          id: newsRssArticles.id,
          title: newsRssArticles.title,
          link: newsRssArticles.link,
          imageUrl: newsRssArticles.imageUrl,
          contentSnippet: newsRssArticles.contentSnippet,
          publishedAt: newsRssArticles.publishedAt,
          sourceName: newsRssSource.name,
        })
        .from(newsRssArticles)
        .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
        .where(eq(newsRssArticles.id, job.rssArticleId))
        .limit(1);

      const row = rssRows[0];
      if (!row) {
        await db
          .update(rssAutoWriterQueue)
          .set({
            status: "failed",
            lastError: "Source RSS article not found.",
            lockedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(rssAutoWriterQueue.id, job.id));
        failed += 1;
        results.push({
          phase: "writer",
          queueId: job.id,
          rssId: job.rssArticleId,
          link: job.sourceUrl,
          status: "error",
          reason: "Source RSS article not found.",
        });
      } else {
        try {
          let handledBySkip = false;
          const bySourceUrl = await db
            .select({ id: articles.id })
            .from(articles)
            .where(sql`coalesce(${articles.seo}->>'sourceUrl','') = ${row.link}`)
            .limit(1);
          if (bySourceUrl[0]) {
            await db
              .update(rssAutoWriterQueue)
              .set({
                status: "skipped",
                processedAt: new Date(),
                lockedAt: null,
                articleId: bySourceUrl[0].id,
                lastError: "Duplicate source URL already exists.",
                updatedAt: new Date(),
              })
              .where(eq(rssAutoWriterQueue.id, job.id));
            skipped += 1;
            results.push({
              phase: "writer",
              queueId: job.id,
              rssId: row.id,
              link: row.link,
              status: "skipped_duplicate_source",
              articleId: bySourceUrl[0].id,
              reason: "Duplicate source URL already exists.",
            });
          } else {
            const slugHint = deriveSlugHintFromLink(row.link);
            if (slugHint) {
              const bySlugHint = await db
                .select({ id: articles.id })
                .from(articles)
                .where(eq(articles.slug, slugHint))
                .limit(1);
              if (bySlugHint[0]) {
                await db
                  .update(rssAutoWriterQueue)
                  .set({
                    status: "skipped",
                    processedAt: new Date(),
                    lockedAt: null,
                    articleId: bySlugHint[0].id,
                    lastError: `Duplicate slug exists: ${slugHint}`,
                    updatedAt: new Date(),
                  })
                  .where(eq(rssAutoWriterQueue.id, job.id));
                skipped += 1;
                results.push({
                  phase: "writer",
                  queueId: job.id,
                  rssId: row.id,
                  link: row.link,
                  status: "skipped_duplicate_source",
                  articleId: bySlugHint[0].id,
                  reason: `Duplicate slug exists: ${slugHint}`,
                });
                handledBySkip = true;
              }
            }

            if (!handledBySkip) {
              const cloudinaryUrl = await uploadImage(row.imageUrl?.trim() || "");
              if (!cloudinaryUrl || !cloudinaryUrl.includes("res.cloudinary.com")) {
                throw new Error("Cloudinary upload did not return a Cloudinary URL.");
              }

              const sourceFacts = [
                `Headline: ${row.title}`,
                `Source: ${row.sourceName}`,
                `Source URL: ${row.link}`,
                `Published at: ${row.publishedAt?.toISOString() ?? "unknown"}`,
                `Summary: ${row.contentSnippet ?? ""}`,
              ].join("\n");

              const generated = await generateArticleAssistAll({
                html: sourceFacts,
                title: row.title,
                sourceUrl: row.link,
                sourceTitle: row.title,
                customPrompt: ARTICLE_ASSISTANT_MARKDOWN_PROMPT,
              });
              if (!generated.draftMarkdown.trim()) {
                throw new Error("Assistant returned empty markdown.");
              }

              const articleId = newArticleId();
              const desiredSlug = slugify(
                generated.slug || generated.title || row.title,
              );
              const finalSlug = await ensureUniqueSlug(desiredSlug);
              const readingMinutes = estimateReadingMinutes(generated.draftMarkdown);
              const seoKeywords = generated.tags.slice(0, 20);
              const excerpt =
                generated.excerpt?.trim() ||
                row.contentSnippet?.trim() ||
                generated.draftMarkdown.slice(0, 240);

              await db.insert(articles).values({
                id: articleId,
                slug: finalSlug,
                title: generated.title || row.title,
                excerpt,
                coverImageUrl: cloudinaryUrl,
                category: generated.category || "General",
                authorId,
                seo: {
                  title: generated.title || row.title,
                  description: generated.seoDescription || excerpt,
                  keywords: seoKeywords,
                  sourceUrl: row.link,
                  sourceName: row.sourceName,
                  sourceType: "news_rss_articles",
                  sourceArticleId: row.id,
                },
                readingMinutes,
                isDraft: true,
                contentMarkdown: generated.draftMarkdown,
              });

              await saveTaxonomy(
                articleId,
                generated.category || "General",
                generated.tags,
              );

              await db
                .update(rssAutoWriterQueue)
                .set({
                  status: "done",
                  articleId,
                  processedAt: new Date(),
                  lastError: null,
                  lockedAt: null,
                  updatedAt: new Date(),
                })
                .where(eq(rssAutoWriterQueue.id, job.id));

              writerProcessed += 1;
              results.push({
                phase: "writer",
                queueId: job.id,
                rssId: row.id,
                link: row.link,
                status: "writer_processed",
                articleId,
              });
            }
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown error";
          await db
            .update(rssAutoWriterQueue)
            .set({
              status: "failed",
              lastError: reason.slice(0, 2000),
              lockedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(rssAutoWriterQueue.id, job.id));
          failed += 1;
          results.push({
            phase: "writer",
            queueId: job.id,
            rssId: row.id,
            link: row.link,
            status: "error",
            reason,
          });
        }
      }
    }
  }

  const statusCounts = await db
    .select({
      status: rssAutoWriterQueue.status,
      count: sql<number>`count(*)::int`,
    })
    .from(rssAutoWriterQueue)
    .groupBy(rssAutoWriterQueue.status);
  const queueStats = {
    queued: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
  };
  for (const row of statusCounts) {
    if (row.status === "queued") queueStats.queued = row.count;
    if (row.status === "processing") queueStats.processing = row.count;
    if (row.status === "failed") queueStats.failed = row.count;
    if (row.status === "done") queueStats.done = row.count;
    if (row.status === "skipped") queueStats.skipped = row.count;
  }

  const finishedAt = new Date();
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    ingestedScanned: pending.length,
    queued,
    writerProcessed,
    skipped,
    failed,
    queueStats,
    results,
  };
}
