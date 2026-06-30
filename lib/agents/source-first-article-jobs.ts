import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sourceFirstArticleJobs } from "@/db/schema";
import { generateSourceFirstArticle } from "@/lib/ai/article-assist-service";
import {
  gatherSourceFirstResearch,
  type SourceFirstPacket,
} from "@/lib/ai/source-first-research";

const LOCK_STALE_MINUTES = 45;
const MAX_ATTEMPTS = 3;

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
  };
};

export type SourceFirstJobPayload = {
  id: string;
  topic: string;
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

function serializeJob(row: {
  id: string;
  topic: string;
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
  return row;
}

export async function createSourceFirstArticleJob(input: {
  topic: string;
  createdBy?: string | null;
}): Promise<SourceFirstJobPayload> {
  const topic = normalizeTopic(input.topic);
  if (!topic) throw new Error("Topic is required.");

  const [job] = await db
    .insert(sourceFirstArticleJobs)
    .values({
      topic,
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
  const research = await gatherSourceFirstResearch(job.topic, {
    searchLimit: 4,
    minSources: 2,
  });
  const generated = await generateSourceFirstArticle({
    query: research.query,
    sources: research.sources,
  });

  const result: SourceFirstJobResult = {
    title: generated.title,
    slug: generated.slug,
    category: generated.category,
    tags: generated.tags,
    excerpt: generated.excerpt,
    draftMarkdown: generated.draftMarkdown,
    draftHtml: "",
    seoDescription: generated.seoDescription,
    sourceFirst: {
      query: research.query,
      sources: research.sources.map((source) => ({
        ...source,
        extractedLength: source.extractedText.length,
      })),
      skipped: research.skipped,
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
