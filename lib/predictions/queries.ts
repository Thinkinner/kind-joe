import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  predictionMarkets,
  predictionOptions,
  predictionVotes,
} from "@/db/schema";

type MarketRow = typeof predictionMarkets.$inferSelect;
type OptionRow = typeof predictionOptions.$inferSelect;

export type PredictionOptionView = {
  id: number;
  label: string;
  sortOrder: number;
  votes: number;
  percentage: number;
};

export type PredictionMarketView = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: "open" | "locked" | "resolved";
  opensAt: string | null;
  locksAt: string | null;
  resolvedAt: string | null;
  totalVotes: number;
  options: PredictionOptionView[];
  viewerVoteOptionId: number | null;
};

function asIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function toViews(
  markets: MarketRow[],
  options: OptionRow[],
  counts: Array<{ marketId: number; optionId: number; count: number }>,
  viewerVotes: Array<{ marketId: number; optionId: number }>,
): PredictionMarketView[] {
  const optionBuckets = new Map<number, OptionRow[]>();
  for (const o of options) {
    const arr = optionBuckets.get(o.marketId) ?? [];
    arr.push(o);
    optionBuckets.set(o.marketId, arr);
  }

  const countMap = new Map<string, number>();
  for (const c of counts) {
    countMap.set(`${c.marketId}:${c.optionId}`, c.count);
  }

  const viewerVoteMap = new Map<number, number>();
  for (const v of viewerVotes) {
    viewerVoteMap.set(v.marketId, v.optionId);
  }

  return markets.map((m) => {
    const marketOptions = (optionBuckets.get(m.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const totalVotes = marketOptions.reduce((acc, o) => {
      return acc + (countMap.get(`${m.id}:${o.id}`) ?? 0);
    }, 0);

    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      description: m.description ?? null,
      status: m.status,
      opensAt: asIso(m.opensAt),
      locksAt: asIso(m.locksAt),
      resolvedAt: asIso(m.resolvedAt),
      totalVotes,
      options: marketOptions.map((o) => {
        const votes = countMap.get(`${m.id}:${o.id}`) ?? 0;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        return {
          id: o.id,
          label: o.label,
          sortOrder: o.sortOrder,
          votes,
          percentage,
        };
      }),
      viewerVoteOptionId: viewerVoteMap.get(m.id) ?? null,
    };
  });
}

export async function listPredictionMarkets(params?: {
  limit?: number;
  status?: "open" | "locked" | "resolved";
  viewerId?: string | null;
}): Promise<PredictionMarketView[]> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const where = params?.status
    ? eq(predictionMarkets.status, params.status)
    : undefined;

  const markets = await db
    .select()
    .from(predictionMarkets)
    .where(where)
    .orderBy(desc(predictionMarkets.createdAt))
    .limit(limit);

  if (markets.length === 0) return [];
  const marketIds = markets.map((m) => m.id);

  const options = await db
    .select()
    .from(predictionOptions)
    .where(inArray(predictionOptions.marketId, marketIds));

  const counts = await db
    .select({
      marketId: predictionVotes.marketId,
      optionId: predictionVotes.optionId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionVotes)
    .where(inArray(predictionVotes.marketId, marketIds))
    .groupBy(predictionVotes.marketId, predictionVotes.optionId);

  const viewerVotes =
    params?.viewerId && params.viewerId.length > 0
      ? await db
          .select({
            marketId: predictionVotes.marketId,
            optionId: predictionVotes.optionId,
          })
          .from(predictionVotes)
          .where(
            and(
              inArray(predictionVotes.marketId, marketIds),
              eq(predictionVotes.voterId, params.viewerId),
            ),
          )
      : [];

  return toViews(markets, options, counts, viewerVotes);
}

export async function getPredictionMarketBySlug(
  slug: string,
  viewerId?: string | null,
): Promise<PredictionMarketView | null> {
  const markets = await db
    .select()
    .from(predictionMarkets)
    .where(eq(predictionMarkets.slug, slug))
    .limit(1);
  const m = markets[0];
  if (!m) return null;

  const options = await db
    .select()
    .from(predictionOptions)
    .where(eq(predictionOptions.marketId, m.id));

  const counts = await db
    .select({
      marketId: predictionVotes.marketId,
      optionId: predictionVotes.optionId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionVotes)
    .where(eq(predictionVotes.marketId, m.id))
    .groupBy(predictionVotes.marketId, predictionVotes.optionId);

  const viewerVotes =
    viewerId && viewerId.length > 0
      ? await db
          .select({
            marketId: predictionVotes.marketId,
            optionId: predictionVotes.optionId,
          })
          .from(predictionVotes)
          .where(
            and(
              eq(predictionVotes.marketId, m.id),
              eq(predictionVotes.voterId, viewerId),
            ),
          )
      : [];

  return toViews([m], options, counts, viewerVotes)[0] ?? null;
}

export async function getPredictionMarketById(
  marketId: number,
  viewerId?: string | null,
): Promise<PredictionMarketView | null> {
  const markets = await db
    .select()
    .from(predictionMarkets)
    .where(eq(predictionMarkets.id, marketId))
    .limit(1);
  const m = markets[0];
  if (!m) return null;

  const options = await db
    .select()
    .from(predictionOptions)
    .where(eq(predictionOptions.marketId, m.id));

  const counts = await db
    .select({
      marketId: predictionVotes.marketId,
      optionId: predictionVotes.optionId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionVotes)
    .where(eq(predictionVotes.marketId, m.id))
    .groupBy(predictionVotes.marketId, predictionVotes.optionId);

  const viewerVotes =
    viewerId && viewerId.length > 0
      ? await db
          .select({
            marketId: predictionVotes.marketId,
            optionId: predictionVotes.optionId,
          })
          .from(predictionVotes)
          .where(
            and(
              eq(predictionVotes.marketId, m.id),
              eq(predictionVotes.voterId, viewerId),
            ),
          )
      : [];

  return toViews([m], options, counts, viewerVotes)[0] ?? null;
}
