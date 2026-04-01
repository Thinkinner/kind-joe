import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { predictionLikes, predictionMarkets } from "@/db/schema";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const likeBodySchema = z.object({
  marketId: z.number().int().positive(),
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
    const parsed = likeBodySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { marketId } = parsed.data;

    const market = await db
      .select({ id: predictionMarkets.id })
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, marketId))
      .limit(1);
    if (!market[0]) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }

    const existing = await db
      .select({ id: predictionLikes.id })
      .from(predictionLikes)
      .where(
        and(
          eq(predictionLikes.marketId, marketId),
          eq(predictionLikes.userId, viewerId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .delete(predictionLikes)
        .where(eq(predictionLikes.id, existing[0].id));
    } else {
      await db.insert(predictionLikes).values({
        marketId,
        userId: viewerId,
      });
    }

    const hydrated = await getPredictionMarketById(marketId, viewerId);
    return NextResponse.json({
      market: hydrated,
      liked: !existing[0],
    });
  } catch (err) {
    console.error("prediction_like_toggle_failed", err);
    return NextResponse.json(
      { error: "Could not update reaction." },
      { status: 500 },
    );
  }
}

