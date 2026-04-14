import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { predictionMarkets, predictionOptions } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  ensureUniquePredictionSlug,
  slugifyPredictionTitle,
} from "@/lib/predictions/admin";
import { PREDICTION_CATEGORIES } from "@/lib/predictions/categories";
import { listPredictionMarkets } from "@/lib/predictions/queries";

const createMarketSchema = z.object({
  title: z.string().trim().min(4).max(240),
  description: z.string().trim().max(1200).optional(),
  category: z.enum(PREDICTION_CATEGORIES).optional(),
  opensAt: z.string().datetime().optional(),
  locksAt: z.string().datetime().optional(),
  options: z.array(z.string().trim().min(1).max(180)).min(2).max(12),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const markets = await listPredictionMarkets({ limit: 200 });
  return NextResponse.json({ markets });
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = createMarketSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const title = parsed.data.title.trim();
    const description = parsed.data.description?.trim() || null;
    const category = parsed.data.category ?? "general";
    const opensAt = parsed.data.opensAt ? new Date(parsed.data.opensAt) : new Date();
    const locksAt = parsed.data.locksAt ? new Date(parsed.data.locksAt) : null;
    if (locksAt && locksAt <= opensAt) {
      return NextResponse.json(
        { error: "Lock time must be after open time." },
        { status: 400 },
      );
    }

    const cleanedOptions = parsed.data.options
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const deduped = [...new Set(cleanedOptions.map((s) => s.toLowerCase()))];
    if (deduped.length < 2) {
      return NextResponse.json(
        { error: "Add at least 2 unique options." },
        { status: 400 },
      );
    }

    const canonicalByLower = new Map<string, string>();
    for (const s of cleanedOptions) {
      const k = s.toLowerCase();
      if (!canonicalByLower.has(k)) canonicalByLower.set(k, s);
    }
    const finalOptions = [...canonicalByLower.values()];

    const slug = await ensureUniquePredictionSlug(slugifyPredictionTitle(title));

    const inserted = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(predictionMarkets)
        .values({
          slug,
          title,
          description,
          category,
          opensAt,
          locksAt,
          status: "open",
        })
        .returning({ id: predictionMarkets.id });
      const marketId = rows[0]?.id;
      if (!marketId) {
        throw new Error("Could not create market.");
      }
      await tx.insert(predictionOptions).values(
        finalOptions.map((label, idx) => ({
          marketId,
          label,
          sortOrder: idx,
        })),
      );
      return marketId;
    });

    const market = (
      await listPredictionMarkets({ limit: 1 })
    ).find((m) => m.id === inserted);
    return NextResponse.json({ market }, { status: 201 });
  } catch (err) {
    console.error("admin_create_prediction_failed", err);
    return NextResponse.json(
      { error: "Could not create market." },
      { status: 500 },
    );
  }
}
