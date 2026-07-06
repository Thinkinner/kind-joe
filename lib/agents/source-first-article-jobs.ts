import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sourceFirstArticleJobs } from "@/db/schema";
import { generateEditorialTopicArticle, generateSourceFirstArticle } from "@/lib/ai/article-assist-service";
import {
  gatherSourceFirstResearch,
  type SourceFirstPacket,
} from "@/lib/ai/source-first-research";

const LOCK_STALE_MINUTES = 45;
const MAX_ATTEMPTS = 3;
const SOURCE_FIRST_ARTICLE_MODEL =
  process.env.SOURCE_FIRST_ARTICLE_MODEL ||
  process.env.GEMINI_ARTICLE_ASSIST_MODEL ||
  "gemini-3.5-flash";
const FALLBACK_TAGS = [
  "source-first",
  "news",
  "verified-sources",
  "google-news",
  "article-draft",
  "current-events",
  "reporting",
  "public-interest",
  "developing-story",
  "context",
  "analysis",
  "kind-joe",
];
const GENERIC_FILLER_PATTERNS = [
  /public official, a high-profile community event/i,
  /which specific people or groups organized the confrontation/i,
  /broader political conflict that continues to divide voters/i,
];

export type SourceFirstWritingMode = "auto" | "source-first" | "editorial";

export function normalizeWritingMode(value: unknown): SourceFirstWritingMode {
  const normalized = String(value ?? "auto").trim().toLowerCase();
  if (
    normalized === "source-first" ||
    normalized === "editorial" ||
    normalized === "auto"
  ) {
    return normalized;
  }
  return "auto";
}

export type SourceFirstJobStatus =
  | "queued"
  | "processing"
  | "done"
  | "failed";

export type SourceFirstJobResult = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  draftMarkdown: string;
  draftHtml: string;
  seoDescription: string;
  sourceFirst: {
    query: string;
    sources: Array<
      SourceFirstPacket & {
        extractedLength: number;
      }
    >;
    skipped: Array<{
      url: string;
      title: string;
      reason: string;
    }>;
    limitedSources: boolean;
    generationMode: "source-first" | "editorial";
  };
};

export type SourceFirstJobPayload = {
  id: string;
  topic: string;
  adsenseReady: boolean;
  writingMode: SourceFirstWritingMode;
  status: string;
  sources: unknown;
  result: unknown;
  error: string | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

function normalizeTopic(topic: string): string {
  return topic.trim().slice(0, 500);
}

function stripMarkdownAndUrls(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toKebab(value: string): string {
  return stripMarkdownAndUrls(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function titleLooksBroken(value: string): boolean {
  const cleaned = stripMarkdownAndUrls(value);
  return (
    cleaned.length < 20 ||
    /\bhttps?\b|news\.google\.com|rss\/articles/i.test(value) ||
    /^(and|or|but|with|from|by)\b/i.test(cleaned)
  );
}

function slugLooksBroken(value: string): boolean {
  return !value || /https?|news-google|news\.google|rss|articles|cbmi/i.test(value);
}

function deriveSafeTitle(input: {
  generatedTitle: string;
  topic: string;
  sources: SourceFirstPacket[];
}): string {
  if (!titleLooksBroken(input.generatedTitle)) {
    return stripMarkdownAndUrls(input.generatedTitle).slice(0, 160);
  }

  const sourceTitle = input.sources
    .map((source) => stripMarkdownAndUrls(source.title))
    .find((title) => !titleLooksBroken(title));
  if (sourceTitle) return sourceTitle.slice(0, 160);

  const topic = stripMarkdownAndUrls(input.topic);
  return (topic || "Source-first article").slice(0, 160);
}

function sanitizeTags(tags: string[], title: string): string[] {
  const cleaned = tags
    .map(toKebab)
    .filter((tag) => {
      if (!tag) return false;
      if (tag.length > 40) return false;
      if (/https?|news-google|rss|articles|cbmi/i.test(tag)) return false;
      return true;
    });

  const fromTitle = title
    .split(/\s+/)
    .map(toKebab)
    .filter((tag) => tag.length >= 3 && tag.length <= 24);

  return Array.from(new Set([...cleaned, ...fromTitle, ...FALLBACK_TAGS])).slice(
    0,
    20,
  );
}

function sanitizeDraftMarkdown(markdown: string, title: string): string {
  const safeTitle = stripMarkdownAndUrls(title);
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim());

  if (firstContentIndex === -1) return `# ${safeTitle}`;

  if (/^#\s+/.test(lines[firstContentIndex].trim())) {
    lines[firstContentIndex] = `# ${safeTitle}`;
    return lines.join("\n").trim();
  }

  return [`# ${safeTitle}`, "", markdown].join("\n").trim();
}

function assertDraftIsSpecific(markdown: string) {
  const matchedPattern = GENERIC_FILLER_PATTERNS.find((pattern) =>
    pattern.test(markdown),
  );
  if (matchedPattern) {
    throw new Error(
      "Generated draft contained generic filler that did not match the source story.",
    );
  }
}

function serializeJob(row: {
  id: string;
  topic: string;
  adsenseReady: boolean;
  writingMode: string;
  status: string;
  sources: unknown;
  result: unknown;
  error: string | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}): SourceFirstJobPayload {
  return {
    ...row,
    writingMode: normalizeWritingMode(row.writingMode),
  };
}

export async function createSourceFirstArticleJob(input: {
  topic: string;
  createdBy?: string | null;
  adsenseReady?: boolean;
  writingMode?: SourceFirstWritingMode;
}): Promise<SourceFirstJobPayload> {
  const topic = normalizeTopic(input.topic);
  if (!topic) throw new Error("Topic is required.");

  const [job] = await db
    .insert(sourceFirstArticleJobs)
    .values({
      topic,
      adsenseReady: input.adsenseReady === true,
      writingMode: normalizeWritingMode(input.writingMode ?? "auto"),
      createdBy: input.createdBy ?? null,
      status: "queued",
      updatedAt: new Date(),
    })
    .returning();

  return serializeJob(job);
}

export async function getSourceFirstArticleJob(
  id: string,
): Promise<SourceFirstJobPayload | null> {
  const [job] = await db
    .select()
    .from(sourceFirstArticleJobs)
    .where(eq(sourceFirstArticleJobs.id, id))
    .limit(1);

  return job ? serializeJob(job) : null;
}

export async function claimNextSourceFirstArticleJob(): Promise<SourceFirstJobPayload | null> {
  const staleCutoff = new Date(Date.now() - LOCK_STALE_MINUTES * 60 * 1000);
  const [candidate] = await db
    .select()
    .from(sourceFirstArticleJobs)
    .where(
      and(
        or(
          eq(sourceFirstArticleJobs.status, "queued"),
          and(
            eq(sourceFirstArticleJobs.status, "processing"),
            or(
              isNull(sourceFirstArticleJobs.lockedAt),
              lt(sourceFirstArticleJobs.lockedAt, staleCutoff),
            ),
          ),
        ),
        lt(sourceFirstArticleJobs.attemptCount, MAX_ATTEMPTS),
      ),
    )
    .orderBy(asc(sourceFirstArticleJobs.createdAt))
    .limit(1);

  if (!candidate) return null;

  const now = new Date();
  const [claimed] = await db
    .update(sourceFirstArticleJobs)
    .set({
      status: "processing",
      lockedAt: now,
      startedAt: candidate.startedAt ?? now,
      attemptCount: sql`${sourceFirstArticleJobs.attemptCount} + 1`,
      error: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(sourceFirstArticleJobs.id, candidate.id),
        or(
          eq(sourceFirstArticleJobs.status, "queued"),
          and(
            eq(sourceFirstArticleJobs.status, "processing"),
            or(
              isNull(sourceFirstArticleJobs.lockedAt),
              lt(sourceFirstArticleJobs.lockedAt, staleCutoff),
            ),
          ),
        ),
      ),
    )
    .returning();

  return claimed ? serializeJob(claimed) : null;
}

export async function processSourceFirstArticleJob(
  job: SourceFirstJobPayload,
): Promise<SourceFirstJobResult> {
  const writingMode = normalizeWritingMode(job.writingMode);
  let research: Awaited<ReturnType<typeof gatherSourceFirstResearch>>;

  console.log(
    `[source-first-worker] job=${job.id} writingMode=${writingMode} adsenseReady=${job.adsenseReady}`,
  );

  if (writingMode === "editorial") {
    research = {
      query: job.topic,
      sources: [],
      skipped: [],
      limitedSources: false,
    };
  } else {
    research = await gatherSourceFirstResearch(job.topic, {
      searchLimit: 4,
      minSources: job.adsenseReady ? 1 : 2,
      requireMinSources: writingMode === "source-first",
    });

    if (writingMode === "source-first" && research.sources.length < 1) {
      throw new Error(
        "No verified sources found for source-backed mode. Paste a direct article URL, configure Google search env vars, or switch to Auto / Editorial writing mode.",
      );
    }
  }

  const generationMode: SourceFirstJobResult["sourceFirst"]["generationMode"] =
    writingMode === "editorial"
      ? "editorial"
      : research.sources.length >= 1
        ? "source-first"
        : "editorial";

  const generated =
    generationMode === "source-first"
      ? await generateSourceFirstArticle({
          query: research.query,
          sources: research.sources,
          model: SOURCE_FIRST_ARTICLE_MODEL,
          adsenseReady: job.adsenseReady,
        })
      : await generateEditorialTopicArticle({
          query: research.query,
          sources: research.sources,
          model: SOURCE_FIRST_ARTICLE_MODEL,
          adsenseReady: job.adsenseReady,
        });
  const safeTitle = deriveSafeTitle({
    generatedTitle: generated.title,
    topic: research.query,
    sources: research.sources,
  });
  const generatedSlug = toKebab(generated.slug);
  const safeSlug = slugLooksBroken(generatedSlug)
    ? toKebab(safeTitle)
    : generatedSlug;
  const safeTags = sanitizeTags(generated.tags, safeTitle);
  const safeDraftMarkdown = sanitizeDraftMarkdown(
    generated.draftMarkdown,
    safeTitle,
  );
  assertDraftIsSpecific(safeDraftMarkdown);

  const result: SourceFirstJobResult = {
    title: safeTitle,
    slug: safeSlug,
    category: generated.category,
    tags: safeTags,
    excerpt: generated.excerpt,
    draftMarkdown: safeDraftMarkdown,
    draftHtml: "",
    seoDescription: generated.seoDescription,
    sourceFirst: {
      query: research.query,
      sources: research.sources.map((source) => ({
        ...source,
        extractedLength: source.extractedText.length,
      })),
      skipped: research.skipped,
      limitedSources: research.limitedSources,
      generationMode,
    },
  };

  const now = new Date();
  await db
    .update(sourceFirstArticleJobs)
    .set({
      status: "done",
      result,
      sources: result.sourceFirst.sources,
      error: null,
      lockedAt: null,
      finishedAt: now,
      updatedAt: now,
    })
    .where(eq(sourceFirstArticleJobs.id, job.id));

  return result;
}

export async function failSourceFirstArticleJob(
  job: SourceFirstJobPayload,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  const shouldRetry = job.attemptCount < MAX_ATTEMPTS;
  const now = new Date();
  await db
    .update(sourceFirstArticleJobs)
    .set({
      status: shouldRetry ? "queued" : "failed",
      error: message,
      lockedAt: null,
      finishedAt: shouldRetry ? null : now,
      updatedAt: now,
    })
    .where(eq(sourceFirstArticleJobs.id, job.id));
}

export async function processOneSourceFirstArticleJob(): Promise<{
  processed: boolean;
  jobId?: string;
}> {
  const job = await claimNextSourceFirstArticleJob();
  if (!job) return { processed: false };

  try {
    await processSourceFirstArticleJob(job);
    return { processed: true, jobId: job.id };
  } catch (error) {
    await failSourceFirstArticleJob(job, error);
    throw error;
  }
}
