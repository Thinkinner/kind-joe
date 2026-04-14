import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  predictionAnonVotes,
  predictionMarkets,
  predictionOptions,
  predictionVotes,
} from "@/db/schema";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const voteBodySchema = z.object({
  marketId: z.number().int().positive(),
  optionId: z.number().int().positive(),
});

const ANON_VOTER_COOKIE = "kindjoe_anon_voter";

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function resolveAnonymousVoter(req: Request): {
  voterKey: string;
  cookieValueToSet?: string;
} {
  const ip = getClientIp(req);
  if (ip && ip !== "unknown") {
    return { voterKey: `ip:${hashString(ip)}` };
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const existing = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${ANON_VOTER_COOKIE}=`))
    ?.split("=")[1];
  if (existing) {
    return { voterKey: `session:${existing}` };
  }

  const generated = randomUUID().replace(/-/g, "");
  return {
    voterKey: `session:${generated}`,
    cookieValueToSet: generated,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id;
    const anonymous = !viewerId ? resolveAnonymousVoter(req) : null;

    const payload = await req.json();
    const parsed = voteBodySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { marketId, optionId } = parsed.data;

    const market = await db
      .select()
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, marketId))
      .limit(1);
    const m = market[0];
    if (!m) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }

    const now = new Date();
    if (m.status !== "open") {
      return NextResponse.json(
        { error: "This market is closed for voting." },
        { status: 409 },
      );
    }
    if (m.opensAt && now < m.opensAt) {
      return NextResponse.json(
        { error: "This market is not open yet." },
        { status: 409 },
      );
    }
    if (m.locksAt && now >= m.locksAt) {
      return NextResponse.json(
        { error: "This market is locked." },
        { status: 409 },
      );
    }

    const option = await db
      .select({ id: predictionOptions.id })
      .from(predictionOptions)
      .where(
        and(
          eq(predictionOptions.id, optionId),
          eq(predictionOptions.marketId, marketId),
        ),
      )
      .limit(1);
    if (!option[0]) {
      return NextResponse.json(
        { error: "Invalid option for this market." },
        { status: 400 },
      );
    }

    if (viewerId) {
      await db
        .insert(predictionVotes)
        .values({
          marketId,
          optionId,
          voterId: viewerId,
        })
        .onConflictDoUpdate({
          target: [predictionVotes.marketId, predictionVotes.voterId],
          set: { optionId },
        });
    } else if (anonymous) {
      await db
        .insert(predictionAnonVotes)
        .values({
          marketId,
          optionId,
          voterKey: anonymous.voterKey,
        })
        .onConflictDoUpdate({
          target: [predictionAnonVotes.marketId, predictionAnonVotes.voterKey],
          set: { optionId },
        });
    }

    const hydrated = await getPredictionMarketById(
      marketId,
      viewerId ?? null,
      anonymous?.voterKey ?? null,
    );
    const response = NextResponse.json({ market: hydrated });
    if (anonymous?.cookieValueToSet) {
      response.cookies.set({
        name: ANON_VOTER_COOKIE,
        value: anonymous.cookieValueToSet,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (err) {
    console.error("prediction_vote_failed", err);
    return NextResponse.json(
      { error: "Could not record your vote." },
      { status: 500 },
    );
  }
}
