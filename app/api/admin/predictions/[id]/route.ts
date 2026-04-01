import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { predictionMarkets } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { getPredictionMarketById } from "@/lib/predictions/queries";

const updateMarketSchema = z.object({
  title: z.string().trim().min(4).max(240).optional(),
  description: z.string().trim().max(1200).nullable().optional(),
  opensAt: z.string().datetime().optional(),
  locksAt: z.string().datetime().nullable().optional(),
  status: z.enum(["open", "locked", "resolved"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const p = await params;
    const marketId = Number(p.id);
    if (!Number.isFinite(marketId) || marketId <= 0) {
      return NextResponse.json({ error: "Invalid market id." }, { status: 400 });
    }

    const parsed = updateMarketSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const current = await db
      .select()
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, marketId))
      .limit(1);
    const row = current[0];
    if (!row) {
      return NextResponse.json({ error: "Market not found." }, { status: 404 });
    }

    const opensAt =
      data.opensAt === undefined
        ? row.opensAt
        : new Date(data.opensAt);
    const locksAt =
      data.locksAt === undefined
        ? row.locksAt
        : data.locksAt === null
          ? null
          : new Date(data.locksAt);
    if (opensAt && locksAt && locksAt <= opensAt) {
      return NextResponse.json(
        { error: "Lock time must be after open time." },
        { status: 400 },
      );
    }

    const nextStatus = data.status ?? row.status;
    const resolvedAt =
      nextStatus === "resolved"
        ? row.resolvedAt ?? new Date()
        : data.status
          ? null
          : row.resolvedAt;

    await db
      .update(predictionMarkets)
      .set({
        title: data.title ?? row.title,
        description:
          data.description === undefined ? row.description : data.description,
        opensAt,
        locksAt,
        status: nextStatus,
        resolvedAt,
        updatedAt: new Date(),
      })
      .where(eq(predictionMarkets.id, marketId));

    const market = await getPredictionMarketById(marketId);
    return NextResponse.json({ market });
  } catch (err) {
    console.error("admin_update_prediction_failed", err);
    return NextResponse.json(
      { error: "Could not update market." },
      { status: 500 },
    );
  }
}
