import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { articles, predictionComments } from "@/db/schema";
import { createPredictionComment } from "@/lib/predictions/comments";

const AUTO_COMMENT_MODEL = "gemini-3.1-flash-lite-preview";
const AUTO_COMMENT_MAX_OUTPUT_TOKENS = 180;
const MIN_DELAY_MINUTES = 20;
const MAX_DELAY_MINUTES = 60;
const MIN_COMMENTS_PER_ARTICLE = 1;
const MAX_COMMENTS_PER_ARTICLE = 3;
const CANDIDATE_LOOKBACK_HOURS = 72;
const BOT_ID_PREFIX = "ai-bot-auto-";
const BOT_FIRST_NAMES = [
  "Mia",
  "Noah",
  "Ava",
  "Liam",
  "Sofia",
  "Ethan",
  "Chloe",
  "Lucas",
  "Nora",
  "Elijah",
];
const BOT_LAST_NAMES = [
  "Carter",
  "Bennett",
  "Reyes",
  "Hayes",
  "Turner",
  "Brooks",
  "Parker",
  "Foster",
  "Diaz",
  "Warren",
];

export type AutoCommentRunResult = {
  enabled: boolean;
  scanned: number;
  posted: number;
  skipped: number;
  reason: string;
  articles: AutoCommentArticleRunEntry[];
};

export type AutoCommentArticleRunEntry = {
  articleId: string;
  slug: string;
  title: string;
  marketId: number | null;
  articleState: "draft" | "scheduled" | "published" | "unpublished";
  status: "posted" | "skipped";
  reason: string;
  commentPreview: string;
  authorId: string;
  delayMinutes: number;
  dueAtIso: string;
};

type AutoCommentArticleCandidate = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentHtml: string | null;
  predictionId: number | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  isDraft: boolean;
};

export type QueuedAutoCommentPayload = {
  articleId: string;
  marketId: number;
  slotIndex: number;
  delayMinutes: number;
  publishedAtIso: string;
  dueAtIso: string;
};

export type AutoCommentScheduleSlotStatus =
  | "posted"
  | "pending"
  | "due_now"
  | "expired"
  | "missing_publish_time"
  | "blocked_previous_slot";

export type AutoCommentScheduleSlot = {
  slotIndex: number;
  delayMinutes: number;
  dueAtIso: string | null;
  status: AutoCommentScheduleSlotStatus;
  timeLeftSeconds: number | null;
  postedCommentBody: string | null;
  postedAtIso: string | null;
};

export type AutoCommentScheduleRow = {
  articleId: string;
  slug: string;
  title: string;
  marketId: number | null;
  articleState: "draft" | "scheduled" | "published" | "unpublished";
  publishedAtIso: string | null;
  commentTargetCount: number;
  postedCount: number;
  slots: AutoCommentScheduleSlot[];
};

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function deterministicTargetCount(articleId: string): number {
  const span = MAX_COMMENTS_PER_ARTICLE - MIN_COMMENTS_PER_ARTICLE + 1;
  return MIN_COMMENTS_PER_ARTICLE + (hashString(`${articleId}:target`) % span);
}

function deterministicDelay(articleId: string, slotIndex: number, targetCount: number): number {
  const window = MAX_DELAY_MINUTES - MIN_DELAY_MINUTES;
  const base = MIN_DELAY_MINUTES + Math.round(((slotIndex + 1) * window) / (targetCount + 1));
  const jitter = (hashString(`${articleId}:slot:${slotIndex}`) % 7) - 3; // -3..+3 min
  return Math.max(MIN_DELAY_MINUTES, Math.min(MAX_DELAY_MINUTES, base + jitter));
}

function buildDelaySchedule(articleId: string): number[] {
  const targetCount = deterministicTargetCount(articleId);
  const schedule: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const delay = deterministicDelay(articleId, i, targetCount);
    const prev = schedule[i - 1];
    schedule.push(typeof prev === "number" ? Math.max(delay, prev + 1) : delay);
  }
  return schedule;
}

export function getAutoCommentScheduleMinutes(articleId: string): number[] {
  return buildDelaySchedule(articleId);
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

async function createFreshAutoCommentBotUser(): Promise<{ id: string; name: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const first = pickOne(BOT_FIRST_NAMES);
    const last = pickOne(BOT_LAST_NAMES);
    const short = randomUUID().replace(/-/g, "").slice(0, 10);
    const id = `${BOT_ID_PREFIX}${short}`;
    const name = `${first} ${last}`;
    const email = `${id}@kindjoe.local`;
    try {
      await db.insert(authUser).values({
        id,
        name,
        email,
        emailVerified: true,
        accountType: "reader",
      });
      return { id, name };
    } catch {
      // Retry collision/transient insert errors with new id.
    }
  }
  throw new Error("could_not_create_fresh_bot_user");
}

function parseGeneratedComment(raw: string): string {
  const text = (raw || "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : text;
  try {
    const parsed = JSON.parse(candidate) as { comment?: unknown };
    const comment = String(parsed.comment ?? "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return comment.slice(0, 280);
  } catch {
    return "";
  }
}

async function generateAutoComment(params: {
  title: string;
  excerpt: string;
  contentText: string;
  slug: string;
}): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  const summary = `${params.excerpt}

${params.contentText}`.trim().slice(0, 1400);
  const prompt = [
    "You are writing one realistic reader comment for an article discussion thread.",
    "Return JSON only: {\"comment\":\"...\"}.",
    "comment must be 1-3 short sentences, under 230 characters.",
    "Sound human and conversational with emotion or feedback.",
    "Reference one specific idea from the article summary.",
    "No hashtags, no promo, no links, no emojis spam, no made-up personal claims.",
    `Article title: ${params.title.slice(0, 220)}`,
    `Article slug: ${params.slug}`,
    `Article summary: ${summary}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: AUTO_COMMENT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.75,
      maxOutputTokens: AUTO_COMMENT_MAX_OUTPUT_TOKENS,
    },
  });

  return parseGeneratedComment(response.text ?? "");
}

function getArticleState(
  article: { isDraft: boolean; publishedAt: Date | null; publishAt: Date | null },
  now: Date,
): "draft" | "scheduled" | "published" | "unpublished" {
  if (article.isDraft) return "draft";
  if (article.publishedAt && article.publishedAt <= now) return "published";
  if (article.publishAt && article.publishAt <= now) return "published";
  if (
    (article.publishedAt && article.publishedAt > now) ||
    (article.publishAt && article.publishAt > now)
  ) {
    return "scheduled";
  }
  return "unpublished";
}

async function runAutoCommentForArticleCandidate(params: {
  article: AutoCommentArticleCandidate;
  now: Date;
  forceDue: boolean;
  expectedSlotIndex?: number;
  expectedPublishedAtIso?: string;
  expectedMarketId?: number;
}): Promise<AutoCommentArticleRunEntry> {
  const { article, now, forceDue } = params;
  const nowMs = now.getTime();
  const articleState = getArticleState(article, now);
  const marketId =
    typeof article.predictionId === "number" && Number.isFinite(article.predictionId)
      ? article.predictionId
      : null;

  if (articleState === "draft") {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "article_is_draft",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  if (marketId == null) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId: null,
      articleState,
      status: "skipped",
      reason: "missing_prediction_market",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  if (typeof params.expectedMarketId === "number" && params.expectedMarketId !== marketId) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "market_changed",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  const publishedRef = article.publishedAt ?? article.publishAt;
  if (!publishedRef) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "missing_publish_time",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  if (params.expectedPublishedAtIso) {
    const actualIso = publishedRef.toISOString();
    if (actualIso !== params.expectedPublishedAtIso) {
      return {
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        articleState,
        status: "skipped",
        reason: "publish_time_changed",
        commentPreview: "",
        authorId: "",
        delayMinutes: 0,
        dueAtIso: "",
      };
    }
  }

  const publishedMs = publishedRef.getTime();
  const schedule = buildDelaySchedule(article.id);
  const targetCount = schedule.length;
  const existingBotComments = await db
    .select({ id: predictionComments.id })
    .from(predictionComments)
    .where(
      and(
        eq(predictionComments.marketId, marketId),
        like(predictionComments.authorId, `${BOT_ID_PREFIX}%`),
      ),
    )
    .limit(MAX_COMMENTS_PER_ARTICLE + 1);

  const existingCount = existingBotComments.length;
  if (existingCount >= targetCount) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "target_comment_count_reached",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  const slotIndex =
    typeof params.expectedSlotIndex === "number" ? params.expectedSlotIndex : existingCount;
  if (slotIndex < 0 || slotIndex >= schedule.length) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "invalid_slot_index",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }
  if (existingCount > slotIndex) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "slot_already_posted",
      commentPreview: "",
      authorId: "",
      delayMinutes: schedule[slotIndex] ?? 0,
      dueAtIso: "",
    };
  }
  if (existingCount < slotIndex) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "previous_slots_pending",
      commentPreview: "",
      authorId: "",
      delayMinutes: schedule[slotIndex] ?? 0,
      dueAtIso: "",
    };
  }

  const nextDelay = schedule[slotIndex] ?? 0;
  const dueAtMs = publishedMs + nextDelay * 60_000;
  const dueAtIso = new Date(dueAtMs).toISOString();
  const windowEndsAtMs = publishedMs + MAX_DELAY_MINUTES * 60_000;

  if (!forceDue && nowMs > windowEndsAtMs) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "comment_window_expired",
      commentPreview: "",
      authorId: "",
      delayMinutes: nextDelay,
      dueAtIso,
    };
  }
  if (!forceDue && nowMs < dueAtMs) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "not_due_yet",
      commentPreview: "",
      authorId: "",
      delayMinutes: nextDelay,
      dueAtIso,
    };
  }

  const contentText = stripHtml(article.contentHtml ?? "");
  const comment = await generateAutoComment({
    title: article.title,
    excerpt: article.excerpt ?? "",
    contentText,
    slug: article.slug,
  });
  if (!comment) {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "ai_no_comment",
      commentPreview: "",
      authorId: "",
      delayMinutes: nextDelay,
      dueAtIso,
    };
  }

  let selectedBotUserId = "";
  try {
    const newBotUser = await createFreshAutoCommentBotUser();
    selectedBotUserId = newBotUser.id;
  } catch {
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "create_bot_user_failed",
      commentPreview: comment,
      authorId: "",
      delayMinutes: nextDelay,
      dueAtIso,
    };
  }

  try {
    await createPredictionComment({
      marketId,
      authorId: selectedBotUserId,
      body: comment,
      parentId: null,
    });
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "posted",
      reason: forceDue ? "posted_force_due" : "posted_due",
      commentPreview: comment,
      authorId: selectedBotUserId,
      delayMinutes: nextDelay,
      dueAtIso,
    };
  } catch (error) {
    console.error("auto_comment_create_failed", {
      articleId: article.id,
      marketId,
      error,
    });
    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      status: "skipped",
      reason: "create_comment_failed",
      commentPreview: comment,
      authorId: selectedBotUserId,
      delayMinutes: nextDelay,
      dueAtIso,
    };
  }
}

export async function processScheduledArticleAutoComments(options?: {
  now?: Date;
  forceDue?: boolean;
  latestOnly?: boolean;
}): Promise<AutoCommentRunResult> {
  const now = options?.now ?? new Date();
  const forceDue = options?.forceDue === true;
  const latestOnly = options?.latestOnly === true;
  const nowMs = now.getTime();

  const lookback = new Date(nowMs - CANDIDATE_LOOKBACK_HOURS * 60 * 60 * 1000);
  const candidates = latestOnly
    ? await db
        .select({
          id: articles.id,
          slug: articles.slug,
          title: articles.title,
          excerpt: articles.excerpt,
          contentHtml: articles.contentHtml,
          predictionId: articles.predictionId,
          publishedAt: articles.publishedAt,
          publishAt: articles.publishAt,
          isDraft: articles.isDraft,
        })
        .from(articles)
        .where(isNull(articles.deletedAt))
        .orderBy(
          desc(
            sql`coalesce(${articles.publishedAt}, ${articles.publishAt}, ${articles.updatedAt}, ${articles.createdAt})`,
          ),
        )
        .limit(1)
    : await db
        .select({
          id: articles.id,
          slug: articles.slug,
          title: articles.title,
          excerpt: articles.excerpt,
          contentHtml: articles.contentHtml,
          predictionId: articles.predictionId,
          publishedAt: articles.publishedAt,
          publishAt: articles.publishAt,
          isDraft: articles.isDraft,
        })
        .from(articles)
        .where(
          and(
            eq(articles.isDraft, false),
            isNull(articles.deletedAt),
            isNotNull(articles.predictionId),
            or(
              and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
              and(
                isNull(articles.publishedAt),
                isNotNull(articles.publishAt),
                lte(articles.publishAt, now),
              ),
            ),
            sql<boolean>`coalesce(${articles.publishedAt}, ${articles.publishAt}) >= ${lookback.toISOString()}`,
          ),
        )
        .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.publishAt})`))
        .limit(80);

  let posted = 0;
  let skipped = 0;
  const articleResults: AutoCommentArticleRunEntry[] = [];

  for (const article of candidates) {
    const result = await runAutoCommentForArticleCandidate({
      article,
      now,
      forceDue,
    });
    if (result.status === "posted") posted += 1;
    else skipped += 1;
    articleResults.push(result);
  }

  return {
    enabled: true,
    scanned: candidates.length,
    posted,
    skipped,
    reason: "",
    articles: articleResults,
  };
}

export async function processQueuedArticleAutoComment(params: {
  articleId: string;
  slotIndex: number;
  marketId?: number;
  publishedAtIso?: string;
  forceDue?: boolean;
  now?: Date;
}): Promise<AutoCommentArticleRunEntry> {
  const now = params.now ?? new Date();
  const [article] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      contentHtml: articles.contentHtml,
      predictionId: articles.predictionId,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      isDraft: articles.isDraft,
    })
    .from(articles)
    .where(and(eq(articles.id, params.articleId), isNull(articles.deletedAt)))
    .limit(1);

  if (!article) {
    return {
      articleId: params.articleId,
      slug: "",
      title: "",
      marketId: typeof params.marketId === "number" ? params.marketId : null,
      articleState: "unpublished",
      status: "skipped",
      reason: "article_not_found",
      commentPreview: "",
      authorId: "",
      delayMinutes: 0,
      dueAtIso: "",
    };
  }

  return runAutoCommentForArticleCandidate({
    article,
    now,
    forceDue: params.forceDue === true,
    expectedSlotIndex: params.slotIndex,
    expectedPublishedAtIso: params.publishedAtIso,
    expectedMarketId: params.marketId,
  });
}

export async function listAutoCommentSchedules(options?: {
  limit?: number;
  now?: Date;
}): Promise<AutoCommentScheduleRow[]> {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);

  const latestArticles = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      predictionId: articles.predictionId,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      isDraft: articles.isDraft,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(isNull(articles.deletedAt), isNotNull(articles.predictionId)))
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.publishAt}, ${articles.updatedAt})`))
    .limit(limit);

  const marketIds = Array.from(
    new Set(
      latestArticles
        .map((a) =>
          typeof a.predictionId === "number" && Number.isFinite(a.predictionId)
            ? a.predictionId
            : null,
        )
        .filter((id): id is number => id != null),
    ),
  );

  const postedComments =
    marketIds.length > 0
      ? await db
          .select({
            marketId: predictionComments.marketId,
            body: predictionComments.body,
            createdAt: predictionComments.createdAt,
          })
          .from(predictionComments)
          .where(
            and(
              inArray(predictionComments.marketId, marketIds),
              like(predictionComments.authorId, `${BOT_ID_PREFIX}%`),
            ),
          )
          .orderBy(desc(predictionComments.createdAt))
      : [];

  const commentsByMarket = new Map<
    number,
    Array<{ body: string; createdAt: Date }>
  >();
  for (const comment of postedComments) {
    const arr = commentsByMarket.get(comment.marketId) ?? [];
    arr.push({
      body: comment.body,
      createdAt: comment.createdAt,
    });
    commentsByMarket.set(comment.marketId, arr);
  }
  for (const [marketId, arr] of commentsByMarket.entries()) {
    commentsByMarket.set(
      marketId,
      [...arr].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    );
  }

  return latestArticles.map((article) => {
    const articleState = getArticleState(article, now);
    const marketId =
      typeof article.predictionId === "number" && Number.isFinite(article.predictionId)
        ? article.predictionId
        : null;
    const publishedRef = article.publishedAt ?? article.publishAt;
    const publishedAtIso = publishedRef ? publishedRef.toISOString() : null;
    const schedule = buildDelaySchedule(article.id);
    const targetCount = schedule.length;
    const posted = marketId != null ? commentsByMarket.get(marketId) ?? [] : [];
    const postedCount = Math.min(posted.length, targetCount);

    const slots: AutoCommentScheduleSlot[] = schedule.map((delayMinutes, slotIndex) => {
      if (!publishedRef) {
        return {
          slotIndex,
          delayMinutes,
          dueAtIso: null,
          status: "missing_publish_time",
          timeLeftSeconds: null,
          postedCommentBody: null,
          postedAtIso: null,
        };
      }

      const dueAtMs = publishedRef.getTime() + delayMinutes * 60_000;
      const dueAtIso = new Date(dueAtMs).toISOString();
      const postedComment = posted[slotIndex];

      if (slotIndex < postedCount && postedComment) {
        return {
          slotIndex,
          delayMinutes,
          dueAtIso,
          status: "posted",
          timeLeftSeconds: 0,
          postedCommentBody: postedComment.body,
          postedAtIso: postedComment.createdAt.toISOString(),
        };
      }

      const windowEndsAtMs = publishedRef.getTime() + MAX_DELAY_MINUTES * 60_000;
      const nextPendingIndex = postedCount;

      if (slotIndex > nextPendingIndex) {
        return {
          slotIndex,
          delayMinutes,
          dueAtIso,
          status: "blocked_previous_slot",
          timeLeftSeconds: Math.max(0, Math.ceil((dueAtMs - nowMs) / 1000)),
          postedCommentBody: null,
          postedAtIso: null,
        };
      }

      if (nowMs > windowEndsAtMs) {
        return {
          slotIndex,
          delayMinutes,
          dueAtIso,
          status: "expired",
          timeLeftSeconds: 0,
          postedCommentBody: null,
          postedAtIso: null,
        };
      }

      if (nowMs >= dueAtMs) {
        return {
          slotIndex,
          delayMinutes,
          dueAtIso,
          status: "due_now",
          timeLeftSeconds: 0,
          postedCommentBody: null,
          postedAtIso: null,
        };
      }

      return {
        slotIndex,
        delayMinutes,
        dueAtIso,
        status: "pending",
        timeLeftSeconds: Math.max(0, Math.ceil((dueAtMs - nowMs) / 1000)),
        postedCommentBody: null,
        postedAtIso: null,
      };
    });

    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      marketId,
      articleState,
      publishedAtIso,
      commentTargetCount: targetCount,
      postedCount,
      slots,
    };
  });
}
