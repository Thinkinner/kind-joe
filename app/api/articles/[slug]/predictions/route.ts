import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { articles, predictionMarkets, predictionOptions } from "@/db/schema";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";
import {
  ensureUniquePredictionSlug,
  slugifyPredictionTitle,
} from "@/lib/predictions/admin";
import {
  PredictionCommentError,
  createPredictionComment,
} from "@/lib/predictions/comments";
import { PREDICTION_CATEGORIES } from "@/lib/predictions/categories";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const createArticlePredictionSchema = z.object({
  topic: z.string().trim().max(240).optional(),
  body: z.string().trim().min(1).max(1200),
  options: z.array(z.string().trim().min(1).max(180)).min(2).max(6).optional(),
  category: z.enum(PREDICTION_CATEGORIES).optional(),
});

function makeTitle(topic: string | undefined, body: string): string {
  const cleanTopic = topic?.trim();
  if (cleanTopic) return cleanTopic;
  const singleLine = body.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 90) return singleLine;
  return `${singleLine.slice(0, 87)}...`;
}

function publishedWhereBySlug(slug: string, now = new Date()) {
  return and(
    eq(articles.slug, slug),
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`(
      ${articles.publishedAt} IS NOT NULL
      AND ${articles.publishedAt} <= ${now.toISOString()}
    )
    OR (
      ${articles.publishedAt} IS NULL
      AND ${articles.publishAt} IS NOT NULL
      AND ${articles.publishAt} <= ${now.toISOString()}
    )`,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const authorId = user?.id;
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkSocialRateLimit(`article-prediction-create-ip:${ip}`, 20, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
        },
      );
    }
    const userLimit = checkSocialRateLimit(
      `article-prediction-create-user:${authorId}`,
      8,
      60_000,
    );
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Posting too fast. Please wait a bit." },
        {
          status: 429,
          headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
        },
      );
    }

    const parsed = createArticlePredictionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { slug } = await params;
    const now = new Date();
    const body = parsed.data.body.trim();
    const title = makeTitle(parsed.data.topic, body);
    const category = parsed.data.category ?? "general";
    const cleanedOptions = (parsed.data.options ?? ["Yes", "No"])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const canonicalByLower = new Map<string, string>();
    for (const value of cleanedOptions) {
      const key = value.toLowerCase();
      if (!canonicalByLower.has(key)) canonicalByLower.set(key, value);
    }
    const finalOptions = [...canonicalByLower.values()];
    if (finalOptions.length < 2) {
      return NextResponse.json(
        { error: "Add at least 2 unique options." },
        { status: 400 },
      );
    }

    const existingArticle = await db
      .select({
        id: articles.id,
        predictionId: articles.predictionId,
      })
      .from(articles)
      .where(publishedWhereBySlug(slug, now))
      .limit(1);
    const article = existingArticle[0];
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    if (article.predictionId != null) {
      const existingMarket = await getPredictionMarketById(article.predictionId, authorId);
      return NextResponse.json(
        {
          market: existingMarket,
          linkedExisting: true,
        },
        { status: 200 },
      );
    }

    const slugValue = await ensureUniquePredictionSlug(slugifyPredictionTitle(title));
    const marketId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(predictionMarkets)
        .values({
          slug: slugValue,
          title,
          description: body,
          category,
          status: "open",
          opensAt: now,
          locksAt: null,
        })
        .returning({ id: predictionMarkets.id });
      const createdMarketId = inserted[0]?.id;
      if (!createdMarketId) {
        throw new Error("MARKET_CREATE_FAILED");
      }
      await tx.insert(predictionOptions).values(
        finalOptions.map((label, idx) => ({
          marketId: createdMarketId,
          label,
          sortOrder: idx,
        })),
      );

      const linked = await tx
        .update(articles)
        .set({
          predictionId: createdMarketId,
          updatedAt: new Date(),
        })
        .where(and(eq(articles.id, article.id), isNull(articles.predictionId)))
        .returning({ id: articles.id });
      if (!linked[0]) {
        throw new Error("ARTICLE_ALREADY_LINKED");
      }
      return createdMarketId;
    });

    try {
      await createPredictionComment({
        marketId,
        authorId,
        body,
      });
    } catch (err) {
      if (!(err instanceof PredictionCommentError && err.code === "COMMENTS_TABLE_MISSING")) {
        throw err;
      }
    }

    const market = await getPredictionMarketById(marketId, authorId);
    if (!market) {
      return NextResponse.json(
        { error: "Could not load created prediction." },
        { status: 500 },
      );
    }

    return NextResponse.json({ market }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "ARTICLE_ALREADY_LINKED") {
      return NextResponse.json(
        { error: "This article already has a linked prediction." },
        { status: 409 },
      );
    }
    console.error("article_prediction_create_failed", err);
    return NextResponse.json(
      { error: "Could not create linked prediction." },
      { status: 500 },
    );
  }
}
