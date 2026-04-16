import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, predictionMarkets } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

function parsePredictionId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const predictionId = parsePredictionId(
    (body as { predictionId?: unknown }).predictionId,
  );
  if (predictionId === undefined) {
    return NextResponse.json(
      { error: "predictionId must be a positive integer or null" },
      { status: 400 },
    );
  }

  if (predictionId != null) {
    const existingPrediction = await db
      .select({ id: predictionMarkets.id })
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, predictionId))
      .limit(1);
    if (!existingPrediction[0]) {
      return NextResponse.json(
        { error: "prediction not found" },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(articles)
    .set({
      predictionId,
      updatedAt: new Date(),
    })
    .where(and(eq(articles.id, id), sql`${articles.deletedAt} IS NULL`))
    .returning({
      id: articles.id,
      predictionId: articles.predictionId,
    });

  if (!updated) {
    return NextResponse.json({ error: "article not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, article: updated });
}
