import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { oxnardPosts } from "@/db/schema";

const MAX_LEGACY_LIST = 50;

export type OxnardPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

export type OxnardPost = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type OxnardPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

export async function listOxnardPosts(): Promise<OxnardPost[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    return await db
      .select({
        id: oxnardPosts.id,
        imageUrl: oxnardPosts.imageUrl,
        destinationUrl: oxnardPosts.destinationUrl,
        caption: oxnardPosts.caption,
        isPinned: oxnardPosts.isPinned,
        order: oxnardPosts.order,
        isActive: oxnardPosts.isActive,
        createdAt: oxnardPosts.createdAt,
      })
      .from(oxnardPosts)
      .where(or(eq(oxnardPosts.isActive, true), isNull(oxnardPosts.isActive)))
      .orderBy(
        desc(oxnardPosts.isPinned),
        asc(oxnardPosts.order),
        desc(oxnardPosts.id),
      )
      .limit(MAX_LEGACY_LIST);
  } catch (error) {
    console.error("oxnard posts query failed:", error);
    return [];
  }
}

export async function listOxnardPostsPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<OxnardPage<OxnardPost>> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);
  const empty = {
    items: [] as OxnardPost[],
    hasMore: false,
    nextOffset: offset,
    limit,
    offset,
  };

  if (!process.env.DATABASE_URL) return empty;

  try {
    const rows = await db
      .select({
        id: oxnardPosts.id,
        imageUrl: oxnardPosts.imageUrl,
        destinationUrl: oxnardPosts.destinationUrl,
        caption: oxnardPosts.caption,
        isPinned: oxnardPosts.isPinned,
        order: oxnardPosts.order,
        isActive: oxnardPosts.isActive,
        createdAt: oxnardPosts.createdAt,
      })
      .from(oxnardPosts)
      .where(or(eq(oxnardPosts.isActive, true), isNull(oxnardPosts.isActive)))
      .orderBy(
        desc(oxnardPosts.isPinned),
        asc(oxnardPosts.order),
        desc(oxnardPosts.id),
      )
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      hasMore,
      nextOffset: offset + items.length,
      limit,
      offset,
    };
  } catch (error) {
    console.error("oxnard posts paged query failed:", error);
    return empty;
  }
}
