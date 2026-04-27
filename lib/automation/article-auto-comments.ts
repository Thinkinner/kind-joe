import { GoogleGenAI } from "@google/genai";
import { and, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { articles, predictionComments } from "@/db/schema";
import { createPredictionComment } from "@/lib/predictions/comments";

const AUTO_COMMENT_MODEL = "gemini-3.1-flash-lite-preview";
const AUTO_COMMENT_MAX_OUTPUT_TOKENS = 180;
const MIN_DELAY_MINUTES = 8;
const MAX_DELAY_MINUTES = 210;
const CANDIDATE_LOOKBACK_HOURS = 72;
const AUTO_COMMENT_BOTS = [
  {
    id: "ai-bot-curious-reader",
    name: "Mia Carter",
    email: "mia.carter+kindjoe-bot@kindjoe.local",
  },
  {
    id: "ai-bot-thoughtful-voice",
    name: "Noah Bennett",
    email: "noah.bennett+kindjoe-bot@kindjoe.local",
  },
  {
    id: "ai-bot-practical-local",
    name: "Ava Reyes",
    email: "ava.reyes+kindjoe-bot@kindjoe.local",
  },
] as const;

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
  status: "posted" | "skipped";
  reason: string;
  commentPreview: string;
  authorId: string;
  delayMinutes: number;
  dueAtIso: string;
};

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deterministicDelayMinutes(articleId: string): number {
  let hash = 0;
  for (let i = 0; i < articleId.length; i += 1) {
    hash = (hash * 31 + articleId.charCodeAt(i)) >>> 0;
  }
  const span = MAX_DELAY_MINUTES - MIN_DELAY_MINUTES + 1;
  return MIN_DELAY_MINUTES + (hash % span);
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

async function ensureAutoCommentBotUsers(): Promise<string[]> {
  const ids = AUTO_COMMENT_BOTS.map((bot) => bot.id);
  const existing = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(inArray(authUser.id, ids));
  const existingIds = new Set(existing.map((row) => row.id));

  const missing = AUTO_COMMENT_BOTS.filter((bot) => !existingIds.has(bot.id));
  if (missing.length > 0) {
    await db.insert(authUser).values(
      missing.map((bot) => ({
        id: bot.id,
        name: bot.name,
        email: bot.email,
        emailVerified: true,
        accountType: "reader",
      })),
    );
  }

  return ids;
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
  const summary = `${params.excerpt}\n\n${params.contentText}`.trim().slice(0, 1400);
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

export async function processScheduledArticleAutoComments(options?: {
  now?: Date;
  forceDue?: boolean;
  latestOnly?: boolean;
}): Promise<AutoCommentRunResult> {
  const now = options?.now ?? new Date();
  const forceDue = options?.forceDue === true;
  const latestOnly = options?.latestOnly === true;

  const botUserIds = await ensureAutoCommentBotUsers();
  if (botUserIds.length === 0) {
    return {
      enabled: false,
      scanned: 0,
      posted: 0,
      skipped: 0,
      reason: "no bot users available",
      articles: [],
    };
  }

  const lookback = new Date(now.getTime() - CANDIDATE_LOOKBACK_HOURS * 60 * 60 * 1000);
  const fetchedCandidates = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      contentHtml: articles.contentHtml,
      predictionId: articles.predictionId,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
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
  const candidates = latestOnly ? fetchedCandidates.slice(0, 1) : fetchedCandidates;

  let posted = 0;
  let skipped = 0;
  const articleResults: AutoCommentArticleRunEntry[] = [];

  for (const article of candidates) {
    const marketId = article.predictionId;
    if (typeof marketId !== "number" || !Number.isFinite(marketId)) {
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId: null,
        status: "skipped",
        reason: "missing_prediction_market",
        commentPreview: "",
        authorId: "",
        delayMinutes: 0,
        dueAtIso: "",
      });
      continue;
    }

    const [existingBotComment] = await db
      .select({ id: predictionComments.id })
      .from(predictionComments)
      .where(
        and(
          eq(predictionComments.marketId, marketId),
          inArray(predictionComments.authorId, botUserIds),
        ),
      )
      .limit(1);
    if (existingBotComment) {
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "skipped",
        reason: "already_commented",
        commentPreview: "",
        authorId: "",
        delayMinutes: 0,
        dueAtIso: "",
      });
      continue;
    }

    const publishedRef = article.publishedAt ?? article.publishAt;
    if (!publishedRef) {
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "skipped",
        reason: "missing_publish_time",
        commentPreview: "",
        authorId: "",
        delayMinutes: 0,
        dueAtIso: "",
      });
      continue;
    }

    const delayMinutes = deterministicDelayMinutes(article.id);
    const dueAtMs = publishedRef.getTime() + delayMinutes * 60_000;
    const dueAtIso = new Date(dueAtMs).toISOString();
    if (!forceDue && now.getTime() < dueAtMs) {
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "skipped",
        reason: "not_due_yet",
        commentPreview: "",
        authorId: "",
        delayMinutes,
        dueAtIso,
      });
      continue;
    }

    const contentText = stripHtml(article.contentHtml ?? "");
    const comment = await generateAutoComment({
      title: article.title,
      excerpt: article.excerpt ?? "",
      contentText,
      slug: article.slug,
    });
    if (!comment) {
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "skipped",
        reason: "ai_no_comment",
        commentPreview: "",
        authorId: "",
        delayMinutes,
        dueAtIso,
      });
      continue;
    }

    const selectedBotUserId =
      botUserIds[deterministicIndex(article.id, botUserIds.length)];

    try {
      await createPredictionComment({
        marketId,
        authorId: selectedBotUserId,
        body: comment,
        parentId: null,
      });
      posted += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "posted",
        reason: forceDue ? "posted_force_due" : "posted_due",
        commentPreview: comment,
        authorId: selectedBotUserId,
        delayMinutes,
        dueAtIso,
      });
    } catch (error) {
      console.error("auto_comment_create_failed", {
        articleId: article.id,
        marketId,
        error,
      });
      skipped += 1;
      articleResults.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        marketId,
        status: "skipped",
        reason: "create_comment_failed",
        commentPreview: comment,
        authorId: selectedBotUserId,
        delayMinutes,
        dueAtIso,
      });
    }
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
