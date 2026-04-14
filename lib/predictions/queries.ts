import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { countCommentsForMarkets } from "@/lib/predictions/comments";
import {
  predictionAnonVotes,
  predictionLikes,
  predictionComments,
  predictionMarkets,
  predictionOptions,
  predictionVotes,
} from "@/db/schema";
import type { PredictionCategory } from "@/lib/predictions/categories";

type OptionRow = typeof predictionOptions.$inferSelect;
type MarketBaseRow = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: "open" | "locked" | "resolved";
  opensAt: Date;
  locksAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type MarketExtras = {
  category: PredictionCategory;
  winningOptionId: number | null;
};

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
  category: PredictionCategory;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  status: "open" | "locked" | "resolved";
  opensAt: string | null;
  locksAt: string | null;
  resolvedAt: string | null;
  winningOptionId: number | null;
  winningOptionLabel: string | null;
  totalVotes: number;
  options: PredictionOptionView[];
  viewerVoteOptionId: number | null;
  commentCount: number;
  likeCount: number;
  viewerLiked: boolean;
};

function asIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function isMissingPredictionPivotColumnsError(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && cur !== null) {
      const maybe = cur as { code?: unknown; message?: unknown; cause?: unknown };
      if (maybe.code === "42703") {
        return true;
      }
      const msg = String(maybe.message ?? "");
      if (
        (msg.includes("prediction_markets") &&
          (msg.includes("category") || msg.includes("winning_option_id"))) ||
        msg.includes('column "category" does not exist') ||
        msg.includes('column "winning_option_id" does not exist')
      ) {
        return true;
      }
      cur = maybe.cause;
      continue;
    }
    break;
  }
  return false;
}

function isUndefinedTableError(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code?: unknown }).code === "42P01"
    ) {
      return true;
    }
    cur =
      typeof cur === "object" &&
      cur !== null &&
      "cause" in cur &&
      (cur as { cause?: unknown }).cause !== undefined
        ? (cur as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}

async function getMarketExtrasByIds(marketIds: number[]): Promise<Map<number, MarketExtras>> {
  const extras = new Map<number, MarketExtras>();
  if (marketIds.length === 0) return extras;
  try {
    const rows = await db
      .select({
        id: predictionMarkets.id,
        category: predictionMarkets.category,
        winningOptionId: predictionMarkets.winningOptionId,
      })
      .from(predictionMarkets)
      .where(inArray(predictionMarkets.id, marketIds));
    for (const row of rows) {
      extras.set(row.id, {
        category: row.category,
        winningOptionId: row.winningOptionId ?? null,
      });
    }
  } catch (err) {
    if (!isMissingPredictionPivotColumnsError(err)) throw err;
  }
  for (const marketId of marketIds) {
    if (!extras.has(marketId)) {
      extras.set(marketId, { category: "general", winningOptionId: null });
    }
  }
  return extras;
}

function toViews(
  markets: MarketBaseRow[],
  options: OptionRow[],
  counts: Array<{ marketId: number; optionId: number; count: number }>,
  viewerVotes: Array<{ marketId: number; optionId: number }>,
  commentCountByMarket: Map<number, number>,
  likeCountByMarket: Map<number, number>,
  viewerLikedMarketIds: Set<number>,
  authorByMarket: Map<number, { id: string; name: string }>,
  marketExtrasById: Map<number, MarketExtras>,
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
    const extras = marketExtrasById.get(m.id) ?? {
      category: "general",
      winningOptionId: null,
    };
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
      category: extras.category,
      authorId: authorByMarket.get(m.id)?.id ?? null,
      authorName: authorByMarket.get(m.id)?.name ?? null,
      createdAt: m.createdAt.toISOString(),
      status: m.status,
      opensAt: asIso(m.opensAt),
      locksAt: asIso(m.locksAt),
      resolvedAt: asIso(m.resolvedAt),
      winningOptionId: extras.winningOptionId,
      winningOptionLabel:
        marketOptions.find((o) => o.id === extras.winningOptionId)?.label ?? null,
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
      commentCount: commentCountByMarket.get(m.id) ?? 0,
      likeCount: likeCountByMarket.get(m.id) ?? 0,
      viewerLiked: viewerLikedMarketIds.has(m.id),
    };
  });
}

async function getAuthorInfoForMarkets(
  marketIds: number[],
): Promise<Map<number, { id: string; name: string }>> {
  const map = new Map<number, { id: string; name: string }>();
  if (marketIds.length === 0) return map;

  const rows = await db
    .select({
      marketId: predictionComments.marketId,
      createdAt: predictionComments.createdAt,
      authorId: predictionComments.authorId,
      authorName: user.name,
    })
    .from(predictionComments)
    .innerJoin(user, eq(predictionComments.authorId, user.id))
    .where(
      and(
        inArray(predictionComments.marketId, marketIds),
        isNull(predictionComments.parentId),
      ),
    )
    .orderBy(asc(predictionComments.createdAt), asc(predictionComments.id));

  for (const row of rows) {
    if (!map.has(row.marketId)) {
      map.set(row.marketId, { id: row.authorId, name: row.authorName });
    }
  }

  return map;
}

export async function listPredictionMarkets(params?: {
  limit?: number;
  offset?: number;
  status?: "open" | "locked" | "resolved";
  category?: string;
  viewerId?: string | null;
  anonymousVoterKey?: string | null;
}): Promise<PredictionMarketView[]> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, Math.min(10000, params?.offset ?? 0));

  const baseMarkets = await db
    .select({
      id: predictionMarkets.id,
      slug: predictionMarkets.slug,
      title: predictionMarkets.title,
      description: predictionMarkets.description,
      status: predictionMarkets.status,
      opensAt: predictionMarkets.opensAt,
      locksAt: predictionMarkets.locksAt,
      resolvedAt: predictionMarkets.resolvedAt,
      createdAt: predictionMarkets.createdAt,
      updatedAt: predictionMarkets.updatedAt,
    })
    .from(predictionMarkets)
    .where(params?.status ? eq(predictionMarkets.status, params.status) : undefined)
    .orderBy(desc(predictionMarkets.createdAt), desc(predictionMarkets.id))
    .offset(offset)
    .limit(limit);

  if (baseMarkets.length === 0) return [];
  const extrasById = await getMarketExtrasByIds(baseMarkets.map((m) => m.id));
  const markets = params?.category
    ? baseMarkets.filter((m) => extrasById.get(m.id)?.category === params.category)
    : baseMarkets;
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
  try {
    const anonCounts = await db
      .select({
        marketId: predictionAnonVotes.marketId,
        optionId: predictionAnonVotes.optionId,
        count: sql<number>`count(*)::int`,
      })
      .from(predictionAnonVotes)
      .where(inArray(predictionAnonVotes.marketId, marketIds))
      .groupBy(predictionAnonVotes.marketId, predictionAnonVotes.optionId);
    for (const row of anonCounts) {
      counts.push(row);
    }
  } catch (err) {
    if (!isUndefinedTableError(err)) throw err;
  }

  let viewerVotes =
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
  if ((!params?.viewerId || params.viewerId.length === 0) && params?.anonymousVoterKey) {
    try {
      viewerVotes = await db
        .select({
          marketId: predictionAnonVotes.marketId,
          optionId: predictionAnonVotes.optionId,
        })
        .from(predictionAnonVotes)
        .where(
          and(
            inArray(predictionAnonVotes.marketId, marketIds),
            eq(predictionAnonVotes.voterKey, params.anonymousVoterKey),
          ),
        );
    } catch (err) {
      if (!isUndefinedTableError(err)) throw err;
    }
  }

  const commentCountByMarket = await countCommentsForMarkets(marketIds);
  const likeCounts = await db
    .select({
      marketId: predictionLikes.marketId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionLikes)
    .where(inArray(predictionLikes.marketId, marketIds))
    .groupBy(predictionLikes.marketId);
  const likeCountByMarket = new Map<number, number>();
  for (const row of likeCounts) {
    likeCountByMarket.set(row.marketId, row.count);
  }
  const viewerLikedRows =
    params?.viewerId && params.viewerId.length > 0
      ? await db
          .select({ marketId: predictionLikes.marketId })
          .from(predictionLikes)
          .where(
            and(
              inArray(predictionLikes.marketId, marketIds),
              eq(predictionLikes.userId, params.viewerId),
            ),
          )
      : [];
  const viewerLikedMarketIds = new Set(viewerLikedRows.map((r) => r.marketId));
  const authorByMarket = await getAuthorInfoForMarkets(marketIds);

  return toViews(
    markets,
    options,
    counts,
    viewerVotes,
    commentCountByMarket,
    likeCountByMarket,
    viewerLikedMarketIds,
    authorByMarket,
    extrasById,
  );
}

export async function getPredictionMarketBySlug(
  slug: string,
  viewerId?: string | null,
  anonymousVoterKey?: string | null,
): Promise<PredictionMarketView | null> {
  const markets = await db
    .select({
      id: predictionMarkets.id,
      slug: predictionMarkets.slug,
      title: predictionMarkets.title,
      description: predictionMarkets.description,
      status: predictionMarkets.status,
      opensAt: predictionMarkets.opensAt,
      locksAt: predictionMarkets.locksAt,
      resolvedAt: predictionMarkets.resolvedAt,
      createdAt: predictionMarkets.createdAt,
      updatedAt: predictionMarkets.updatedAt,
    })
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
  try {
    const anonCounts = await db
      .select({
        marketId: predictionAnonVotes.marketId,
        optionId: predictionAnonVotes.optionId,
        count: sql<number>`count(*)::int`,
      })
      .from(predictionAnonVotes)
      .where(eq(predictionAnonVotes.marketId, m.id))
      .groupBy(predictionAnonVotes.marketId, predictionAnonVotes.optionId);
    for (const row of anonCounts) {
      counts.push(row);
    }
  } catch (err) {
    if (!isUndefinedTableError(err)) throw err;
  }

  let viewerVotes =
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
  if ((!viewerId || viewerId.length === 0) && anonymousVoterKey) {
    try {
      viewerVotes = await db
        .select({
          marketId: predictionAnonVotes.marketId,
          optionId: predictionAnonVotes.optionId,
        })
        .from(predictionAnonVotes)
        .where(
          and(
            eq(predictionAnonVotes.marketId, m.id),
            eq(predictionAnonVotes.voterKey, anonymousVoterKey),
          ),
        );
    } catch (err) {
      if (!isUndefinedTableError(err)) throw err;
    }
  }

  const commentCountByMarket = await countCommentsForMarkets([m.id]);
  const likeCounts = await db
    .select({
      marketId: predictionLikes.marketId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionLikes)
    .where(eq(predictionLikes.marketId, m.id))
    .groupBy(predictionLikes.marketId);
  const likeCountByMarket = new Map<number, number>();
  for (const row of likeCounts) {
    likeCountByMarket.set(row.marketId, row.count);
  }
  const viewerLikedRows =
    viewerId && viewerId.length > 0
      ? await db
          .select({ marketId: predictionLikes.marketId })
          .from(predictionLikes)
          .where(
            and(
              eq(predictionLikes.marketId, m.id),
              eq(predictionLikes.userId, viewerId),
            ),
          )
      : [];
  const viewerLikedMarketIds = new Set(viewerLikedRows.map((r) => r.marketId));
  const authorByMarket = await getAuthorInfoForMarkets([m.id]);
  const extrasById = await getMarketExtrasByIds([m.id]);

  return toViews(
    [m],
    options,
    counts,
    viewerVotes,
    commentCountByMarket,
    likeCountByMarket,
    viewerLikedMarketIds,
    authorByMarket,
    extrasById,
  )[0] ?? null;
}

export async function getPredictionMarketById(
  marketId: number,
  viewerId?: string | null,
  anonymousVoterKey?: string | null,
): Promise<PredictionMarketView | null> {
  const markets = await db
    .select({
      id: predictionMarkets.id,
      slug: predictionMarkets.slug,
      title: predictionMarkets.title,
      description: predictionMarkets.description,
      status: predictionMarkets.status,
      opensAt: predictionMarkets.opensAt,
      locksAt: predictionMarkets.locksAt,
      resolvedAt: predictionMarkets.resolvedAt,
      createdAt: predictionMarkets.createdAt,
      updatedAt: predictionMarkets.updatedAt,
    })
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
  try {
    const anonCounts = await db
      .select({
        marketId: predictionAnonVotes.marketId,
        optionId: predictionAnonVotes.optionId,
        count: sql<number>`count(*)::int`,
      })
      .from(predictionAnonVotes)
      .where(eq(predictionAnonVotes.marketId, m.id))
      .groupBy(predictionAnonVotes.marketId, predictionAnonVotes.optionId);
    for (const row of anonCounts) {
      counts.push(row);
    }
  } catch (err) {
    if (!isUndefinedTableError(err)) throw err;
  }

  let viewerVotes =
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
  if ((!viewerId || viewerId.length === 0) && anonymousVoterKey) {
    try {
      viewerVotes = await db
        .select({
          marketId: predictionAnonVotes.marketId,
          optionId: predictionAnonVotes.optionId,
        })
        .from(predictionAnonVotes)
        .where(
          and(
            eq(predictionAnonVotes.marketId, m.id),
            eq(predictionAnonVotes.voterKey, anonymousVoterKey),
          ),
        );
    } catch (err) {
      if (!isUndefinedTableError(err)) throw err;
    }
  }

  const commentCountByMarket = await countCommentsForMarkets([m.id]);
  const likeCounts = await db
    .select({
      marketId: predictionLikes.marketId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictionLikes)
    .where(eq(predictionLikes.marketId, m.id))
    .groupBy(predictionLikes.marketId);
  const likeCountByMarket = new Map<number, number>();
  for (const row of likeCounts) {
    likeCountByMarket.set(row.marketId, row.count);
  }
  const viewerLikedRows =
    viewerId && viewerId.length > 0
      ? await db
          .select({ marketId: predictionLikes.marketId })
          .from(predictionLikes)
          .where(
            and(
              eq(predictionLikes.marketId, m.id),
              eq(predictionLikes.userId, viewerId),
            ),
          )
      : [];
  const viewerLikedMarketIds = new Set(viewerLikedRows.map((r) => r.marketId));
  const authorByMarket = await getAuthorInfoForMarkets([m.id]);
  const extrasById = await getMarketExtrasByIds([m.id]);

  return toViews(
    [m],
    options,
    counts,
    viewerVotes,
    commentCountByMarket,
    likeCountByMarket,
    viewerLikedMarketIds,
    authorByMarket,
    extrasById,
  )[0] ?? null;
}
