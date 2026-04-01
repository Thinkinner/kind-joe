import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { predictionMarkets } from "@/db/schema";

export function slugifyPredictionTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "prediction-market";
}

export async function ensureUniquePredictionSlug(
  requested: string,
  ignoreMarketId?: number,
): Promise<string> {
  const base = requested || "prediction-market";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const where = ignoreMarketId
      ? and(
          eq(predictionMarkets.slug, candidate),
          ne(predictionMarkets.id, ignoreMarketId),
        )
      : eq(predictionMarkets.slug, candidate);
    const existing = await db
      .select({ id: predictionMarkets.id })
      .from(predictionMarkets)
      .where(where)
      .limit(1);
    if (existing.length === 0) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
