import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { and, eq, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { articles, predictionComments } from "@/db/schema";
import { createPredictionComment } from "@/lib/predictions/comments";

const MODEL = "gemini-3.1-flash-lite-preview";
const MAX_OUTPUT_TOKENS = 180;
const BOT_ID_PREFIX = "ai-bot-immediate-";
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

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

async function createFreshBotUser(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const first = pickOne(BOT_FIRST_NAMES);
    const last = pickOne(BOT_LAST_NAMES);
    const short = randomUUID().replace(/-/g, "").slice(0, 10);
    const id = `${BOT_ID_PREFIX}${short}`;
    const email = `${id}@kindjoe.local`;
    try {
      await db.insert(authUser).values({
        id,
        name: `${first} ${last}`,
        email,
        emailVerified: true,
        accountType: "reader",
      });
      return id;
    } catch {
      // Retry collisions/transient insert failures with another id.
    }
  }
  throw new Error("create_bot_user_failed");
}

function parseGeneratedComment(raw: string): string {
  const text = (raw || "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : text;
  try {
    const parsed = JSON.parse(candidate) as { comment?: unknown };
    return String(parsed.comment ?? "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260);
  } catch {
    return "";
  }
}

async function generateComment(params: {
  title: string;
  slug: string;
  excerpt: string;
  contentText: string;
}): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  const summary = `${params.excerpt}\n\n${params.contentText}`.trim().slice(0, 1600);
  const prompt = [
    "You are writing one realistic reader comment for this article discussion.",
    'Return JSON only: {"comment":"..."}',
    "comment must be 1-3 short sentences, under 230 characters.",
    "Sound human and conversational. Reference one specific point from the article summary.",
    "No hashtags, no links, no clickbait, no emojis spam.",
    `Article title: ${params.title.slice(0, 220)}`,
    `Article slug: ${params.slug}`,
    `Article summary: ${summary}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.75,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  return parseGeneratedComment(response.text ?? "");
}

export type ImmediateArticleCommentResult =
  | { status: "posted"; reason: "posted_now"; marketId: number }
  | {
      status: "skipped";
      reason:
        | "article_not_found"
        | "article_is_draft"
        | "missing_prediction_market"
        | "missing_publish_time"
        | "not_published_yet"
        | "already_posted_for_market"
        | "ai_no_comment"
        | "create_bot_user_failed"
        | "create_comment_failed";
      marketId: number | null;
    };

export async function postImmediateArticleComment(params: {
  articleId: string;
  now?: Date;
}): Promise<ImmediateArticleCommentResult> {
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
    return { status: "skipped", reason: "article_not_found", marketId: null };
  }

  if (article.isDraft) {
    return {
      status: "skipped",
      reason: "article_is_draft",
      marketId: article.predictionId ?? null,
    };
  }

  const marketId =
    typeof article.predictionId === "number" && Number.isFinite(article.predictionId)
      ? article.predictionId
      : null;
  if (marketId == null) {
    return { status: "skipped", reason: "missing_prediction_market", marketId: null };
  }

  const publishedRef = article.publishedAt ?? article.publishAt;
  if (!publishedRef) {
    return { status: "skipped", reason: "missing_publish_time", marketId };
  }
  if (publishedRef > now) {
    return { status: "skipped", reason: "not_published_yet", marketId };
  }

  const alreadyPosted = await db
    .select({ id: predictionComments.id })
    .from(predictionComments)
    .where(
      and(
        eq(predictionComments.marketId, marketId),
        like(predictionComments.authorId, `${BOT_ID_PREFIX}%`),
      ),
    )
    .limit(1);
  if (alreadyPosted.length > 0) {
    return { status: "skipped", reason: "already_posted_for_market", marketId };
  }

  const comment = await generateComment({
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    contentText: stripHtml(article.contentHtml ?? ""),
  });
  if (!comment) {
    return { status: "skipped", reason: "ai_no_comment", marketId };
  }

  let botUserId: string;
  try {
    botUserId = await createFreshBotUser();
  } catch {
    return { status: "skipped", reason: "create_bot_user_failed", marketId };
  }

  try {
    await createPredictionComment({
      marketId,
      authorId: botUserId,
      body: comment,
      parentId: null,
    });
    return { status: "posted", reason: "posted_now", marketId };
  } catch (error) {
    console.error("immediate_article_comment_failed", {
      articleId: article.id,
      marketId,
      error,
    });
    return { status: "skipped", reason: "create_comment_failed", marketId };
  }
}
