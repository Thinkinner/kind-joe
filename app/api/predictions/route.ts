import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { predictionMarkets, predictionOptions } from "@/db/schema";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import {
  ensureUniquePredictionSlug,
  slugifyPredictionTitle,
} from "@/lib/predictions/admin";
import {
  PredictionCommentError,
  createPredictionComment,
} from "@/lib/predictions/comments";
import { PREDICTION_CATEGORIES } from "@/lib/predictions/categories";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";
import { getPredictionMarketById, listPredictionMarkets } from "@/lib/predictions/queries";

const createThreadSchema = z.object({
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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const categoryRaw = searchParams.get("category");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = Number(limitRaw ?? "20");
    const offset = Number(offsetRaw ?? "0");

    const status =
      statusRaw === "open" || statusRaw === "locked" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const category = PREDICTION_CATEGORIES.find((c) => c === categoryRaw);

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id ?? null;

    const markets = await listPredictionMarkets({
      status,
      category,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
      viewerId,
    });
    return NextResponse.json({
      markets,
      hasMore: markets.length === Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20)),
      nextOffset: (Number.isFinite(offset) ? Math.max(0, offset) : 0) + markets.length,
    });
  } catch (err) {
    console.error("predictions_list_failed", err);
    return NextResponse.json(
      { error: "Could not load prediction markets." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkSocialRateLimit(`prediction-create-ip:${ip}`, 20, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
        },
      );
    }

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const authorId = user?.id;
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userLimit = checkSocialRateLimit(`prediction-create-user:${authorId}`, 8, 60_000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Posting too fast. Please wait a bit." },
        {
          status: 429,
          headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
        },
      );
    }

    const parsed = createThreadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const body = parsed.data.body.trim();
    const title = makeTitle(parsed.data.topic, body);
    const category = parsed.data.category ?? "general";
    const slug = await ensureUniquePredictionSlug(slugifyPredictionTitle(title));
    const cleanedOptions = (parsed.data.options ?? ["Yes", "No"])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const canonicalByLower = new Map<string, string>();
    for (const s of cleanedOptions) {
      const k = s.toLowerCase();
      if (!canonicalByLower.has(k)) canonicalByLower.set(k, s);
    }
    const finalOptions = [...canonicalByLower.values()];
    if (finalOptions.length < 2) {
      return NextResponse.json(
        { error: "Add at least 2 unique options." },
        { status: 400 },
      );
    }

    const marketId = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(predictionMarkets)
        .values({
          slug,
          title,
          description: body,
          category,
          status: "open",
          opensAt: new Date(),
          locksAt: null,
        })
        .returning({ id: predictionMarkets.id });
      const createdId = rows[0]?.id;
      if (!createdId) {
        throw new Error("Could not create market.");
      }

      await tx.insert(predictionOptions).values(
        finalOptions.map((label, idx) => ({
          marketId: createdId,
          label,
          sortOrder: idx,
        })),
      );
      return createdId;
    });

    try {
      await createPredictionComment({
        marketId,
        authorId,
        body,
      });
    } catch (err) {
      // If comments table is not migrated yet, thread creation should still succeed.
      if (!(err instanceof PredictionCommentError && err.code === "COMMENTS_TABLE_MISSING")) {
        throw err;
      }
    }

    const market = await getPredictionMarketById(marketId, authorId);
    if (!market) {
      return NextResponse.json(
        { error: "Could not load created thread." },
        { status: 500 },
      );
    }

    return NextResponse.json({ market }, { status: 201 });
  } catch (err) {
    console.error("predictions_create_failed", err);
    return NextResponse.json(
      { error: "Could not create thread." },
      { status: 500 },
    );
  }
}
