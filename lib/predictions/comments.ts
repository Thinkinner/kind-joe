import { asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { predictionComments, predictionMarkets } from "@/db/schema";
import {
  PREDICTION_COMMENT_MAX_LENGTH,
  type PredictionCommentAuthorView,
  type PredictionCommentNodeView,
} from "@/lib/predictions/comments-public";

export type { PredictionCommentAuthorView, PredictionCommentNodeView };
export { PREDICTION_COMMENT_MAX_LENGTH };

type Row = {
  id: number;
  marketId: number;
  authorId: string;
  parentId: number | null;
  body: string;
  createdAt: Date;
  authorName: string;
  authorImage: string | null;
  authorUsername: string | null;
};

function asIso(d: Date): string {
  return d.toISOString();
}

/** Postgres undefined_table — e.g. migration not applied yet. */
function isUndefinedTableError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur; i++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code: unknown }).code === "42P01"
    ) {
      return true;
    }
    cur =
      typeof cur === "object" &&
      cur !== null &&
      "cause" in cur &&
      (cur as { cause: unknown }).cause !== undefined
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

function rowToAuthor(r: Row): PredictionCommentAuthorView {
  return {
    id: r.authorId,
    name: r.authorName,
    image: r.authorImage,
    username: r.authorUsername,
  };
}

export async function countCommentsForMarkets(
  marketIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (marketIds.length === 0) return map;
  try {
    const rows = await db
      .select({
        marketId: predictionComments.marketId,
        n: count(),
      })
      .from(predictionComments)
      .where(inArray(predictionComments.marketId, marketIds))
      .groupBy(predictionComments.marketId);
    for (const r of rows) {
      map.set(r.marketId, Number(r.n));
    }
    return map;
  } catch (e) {
    if (isUndefinedTableError(e)) {
      console.warn(
        "[predictions] prediction_comments table missing (run npm run db:migrate on this DATABASE_URL). Using 0 comment counts.",
      );
      for (const id of marketIds) {
        map.set(id, 0);
      }
      return map;
    }
    throw e;
  }
}

export async function listCommentsForMarket(
  marketId: number,
): Promise<PredictionCommentNodeView[]> {
  try {
    const rows = await db
      .select({
        id: predictionComments.id,
        marketId: predictionComments.marketId,
        authorId: predictionComments.authorId,
        parentId: predictionComments.parentId,
        body: predictionComments.body,
        createdAt: predictionComments.createdAt,
        authorName: user.name,
        authorImage: user.image,
        authorUsername: user.username,
      })
      .from(predictionComments)
      .innerJoin(user, eq(predictionComments.authorId, user.id))
      .where(eq(predictionComments.marketId, marketId))
      .orderBy(asc(predictionComments.createdAt));

    const typed = rows as Row[];
    const byParent = new Map<number | null, Row[]>();
    for (const r of typed) {
      const key = r.parentId;
      const arr = byParent.get(key) ?? [];
      arr.push(r);
      byParent.set(key, arr);
    }

    const tops = byParent.get(null) ?? [];
    return tops.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      author: rowToAuthor(r),
      body: r.body,
      createdAt: asIso(r.createdAt),
      replies: (byParent.get(r.id) ?? []).map((reply) => ({
        id: reply.id,
        authorId: reply.authorId,
        author: rowToAuthor(reply),
        body: reply.body,
        createdAt: asIso(reply.createdAt),
        replies: [],
      })),
    }));
  } catch (e) {
    if (isUndefinedTableError(e)) {
      console.warn(
        "[predictions] prediction_comments table missing; discussion empty until db:migrate.",
      );
      return [];
    }
    throw e;
  }
}

export class PredictionCommentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_BODY"
      | "MARKET_NOT_FOUND"
      | "PARENT_NOT_FOUND"
      | "PARENT_WRONG_MARKET"
      | "PARENT_NOT_TOP_LEVEL"
      | "COMMENTS_TABLE_MISSING",
  ) {
    super(message);
    this.name = "PredictionCommentError";
  }
}

export async function createPredictionComment(params: {
  marketId: number;
  authorId: string;
  parentId?: number | null;
  body: string;
}): Promise<PredictionCommentNodeView> {
  const raw = params.body.trim();
  if (!raw) {
    throw new PredictionCommentError("Comment cannot be empty.", "INVALID_BODY");
  }
  if (raw.length > PREDICTION_COMMENT_MAX_LENGTH) {
    throw new PredictionCommentError(
      `Comment must be at most ${PREDICTION_COMMENT_MAX_LENGTH} characters.`,
      "INVALID_BODY",
    );
  }

  const m = await db
    .select({ id: predictionMarkets.id })
    .from(predictionMarkets)
    .where(eq(predictionMarkets.id, params.marketId))
    .limit(1);
  if (!m[0]) {
    throw new PredictionCommentError("Prediction market not found.", "MARKET_NOT_FOUND");
  }

  const parentId: number | null = params.parentId ?? null;

  let row: {
    id: number;
    marketId: number;
    authorId: string;
    parentId: number | null;
    body: string;
    createdAt: Date;
  };

  try {
    if (parentId != null) {
      const parent = await db
        .select({
          id: predictionComments.id,
          marketId: predictionComments.marketId,
          parentId: predictionComments.parentId,
        })
        .from(predictionComments)
        .where(eq(predictionComments.id, parentId))
        .limit(1);
      const p = parent[0];
      if (!p) {
        throw new PredictionCommentError("Parent comment not found.", "PARENT_NOT_FOUND");
      }
      if (p.marketId !== params.marketId) {
        throw new PredictionCommentError(
          "Parent comment does not belong to this market.",
          "PARENT_WRONG_MARKET",
        );
      }
      if (p.parentId != null) {
        throw new PredictionCommentError(
          "You can only reply to top-level comments.",
          "PARENT_NOT_TOP_LEVEL",
        );
      }
    }

    const inserted = await db
      .insert(predictionComments)
      .values({
        marketId: params.marketId,
        authorId: params.authorId,
        parentId,
        body: raw,
      })
      .returning({
        id: predictionComments.id,
        marketId: predictionComments.marketId,
        authorId: predictionComments.authorId,
        parentId: predictionComments.parentId,
        body: predictionComments.body,
        createdAt: predictionComments.createdAt,
      });

    const first = inserted[0];
    if (!first) {
      throw new PredictionCommentError("Could not create comment.", "INVALID_BODY");
    }
    row = first;
  } catch (e) {
    if (isUndefinedTableError(e)) {
      throw new PredictionCommentError(
        "Comments are not set up on this database yet. Run npm run db:migrate using the same DATABASE_URL as this app (migration file drizzle/0005_prediction_comments.sql).",
        "COMMENTS_TABLE_MISSING",
      );
    }
    throw e;
  }

  const authorRows = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, params.authorId))
    .limit(1);
  const a = authorRows[0];
  if (!a) {
    throw new PredictionCommentError("Author not found.", "INVALID_BODY");
  }

  const author: PredictionCommentAuthorView = {
    id: a.id,
    name: a.name,
    image: a.image,
    username: a.username,
  };

  const node: PredictionCommentNodeView = {
    id: row.id,
    authorId: row.authorId,
    author,
    body: row.body,
    createdAt: asIso(row.createdAt),
    parentId: row.parentId,
    replies: [],
  };

  return node;
}

export async function getPredictionMarketIdBySlug(
  slug: string,
): Promise<number | null> {
  const rows = await db
    .select({ id: predictionMarkets.id })
    .from(predictionMarkets)
    .where(eq(predictionMarkets.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}
