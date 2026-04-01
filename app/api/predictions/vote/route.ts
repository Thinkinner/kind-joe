import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  predictionMarkets,
  predictionOptions,
  predictionVotes,
} from "@/db/schema";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const voteBodySchema = z.object({
  marketId: z.number().int().positive(),
  optionId: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id;

    if (!viewerId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

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

    const hydrated = await getPredictionMarketById(marketId, viewerId);
    return NextResponse.json({ market: hydrated });
  } catch (err) {
    console.error("prediction_vote_failed", err);
    return NextResponse.json(
      { error: "Could not record your vote." },
      { status: 500 },
    );
  }
}
