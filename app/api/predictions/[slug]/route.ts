import { and, asc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { predictionComments, predictionMarkets } from "@/db/schema";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { PREDICTION_CATEGORIES } from "@/lib/predictions/categories";
import {
  getPredictionMarketById,
  getPredictionMarketBySlug,
} from "@/lib/predictions/queries";

const updateSchema = z.object({
  title: z.string().trim().min(4).max(240).optional(),
  description: z.string().trim().max(1200).nullable().optional(),
  category: z.enum(PREDICTION_CATEGORIES).optional(),
});

async function resolveMarketId(slugOrId: string): Promise<number | null> {
  const numericId = Number(slugOrId);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  const rows = await db
    .select({ id: predictionMarkets.id })
    .from(predictionMarkets)
    .where(eq(predictionMarkets.slug, slugOrId))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function resolveOwnerId(marketId: number): Promise<string | null> {
  const rows = await db
    .select({ authorId: predictionComments.authorId })
    .from(predictionComments)
    .where(
      and(
        eq(predictionComments.marketId, marketId),
        isNull(predictionComments.parentId),
      ),
    )
    .orderBy(asc(predictionComments.createdAt), asc(predictionComments.id))
    .limit(1);
  return rows[0]?.authorId ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: slugOrId } = await params;
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id ?? null;

    const numericId = Number(slugOrId);
    const market =
      Number.isFinite(numericId) && numericId > 0
        ? await getPredictionMarketById(numericId, viewerId)
        : await getPredictionMarketBySlug(slugOrId, viewerId);
    if (!market) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ market });
  } catch (err) {
    console.error("prediction_detail_failed", err);
    return NextResponse.json(
      { error: "Could not load prediction market." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const p = await params;
    const marketId = await resolveMarketId(p.slug);
    if (!marketId) {
      return NextResponse.json({ error: "Prediction market not found." }, { status: 404 });
    }

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id;
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = await resolveOwnerId(marketId);
    if (!ownerId || ownerId !== viewerId) {
      return NextResponse.json(
        { error: "You can only edit your own poll." },
        { status: 403 },
      );
    }

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const updates: {
      title?: string;
      description?: string | null;
      category?: (typeof PREDICTION_CATEGORIES)[number];
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.category !== undefined) updates.category = payload.category;

    await db
      .update(predictionMarkets)
      .set(updates)
      .where(eq(predictionMarkets.id, marketId));

    const market = await getPredictionMarketById(marketId, viewerId);
    return NextResponse.json({ market });
  } catch (err) {
    console.error("prediction_owner_patch_failed", err);
    return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const p = await params;
    const marketId = await resolveMarketId(p.slug);
    if (!marketId) {
      return NextResponse.json({ error: "Prediction market not found." }, { status: 404 });
    }

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id;
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = await resolveOwnerId(marketId);
    if (!ownerId || ownerId !== viewerId) {
      return NextResponse.json(
        { error: "You can only delete your own poll." },
        { status: 403 },
      );
    }

    await db.delete(predictionMarkets).where(eq(predictionMarkets.id, marketId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("prediction_owner_delete_failed", err);
    return NextResponse.json({ error: "Could not delete poll." }, { status: 500 });
  }
}
