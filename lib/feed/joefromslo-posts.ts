import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { joefromsloPosts } from "@/db/schema";

const MAX_LEGACY_LIST = 50;

export type JoeFromSloPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

export type JoeFromSloPost = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type JoeFromSloPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

export async function listJoeFromSloPosts(): Promise<JoeFromSloPost[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await db
      .select({
        id: joefromsloPosts.id,
        imageUrl: joefromsloPosts.imageUrl,
        destinationUrl: joefromsloPosts.destinationUrl,
        caption: joefromsloPosts.caption,
        isPinned: joefromsloPosts.isPinned,
        order: joefromsloPosts.order,
        isActive: joefromsloPosts.isActive,
        createdAt: joefromsloPosts.createdAt,
      })
      .from(joefromsloPosts)
      .where(
        or(eq(joefromsloPosts.isActive, true), isNull(joefromsloPosts.isActive)),
      )
      .orderBy(
        desc(joefromsloPosts.isPinned),
        asc(joefromsloPosts.order),
        desc(joefromsloPosts.id),
      )
      .limit(MAX_LEGACY_LIST);

    return rows;
  } catch (error) {
    console.error("joefromslo posts query failed:", error);
    return [];
  }
}

export async function listJoeFromSloPostCards(): Promise<JoeFromSloPostCard[]> {
  const rows = await listJoeFromSloPosts();
  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    destinationUrl: row.destinationUrl,
  }));
}

export async function listJoeFromSloPostsPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<JoeFromSloPage<JoeFromSloPost>> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);

  if (!process.env.DATABASE_URL) {
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }

  try {
    const rows = await db
      .select({
        id: joefromsloPosts.id,
        imageUrl: joefromsloPosts.imageUrl,
        destinationUrl: joefromsloPosts.destinationUrl,
        caption: joefromsloPosts.caption,
        isPinned: joefromsloPosts.isPinned,
        order: joefromsloPosts.order,
        isActive: joefromsloPosts.isActive,
        createdAt: joefromsloPosts.createdAt,
      })
      .from(joefromsloPosts)
      .where(
        or(eq(joefromsloPosts.isActive, true), isNull(joefromsloPosts.isActive)),
      )
      .orderBy(
        desc(joefromsloPosts.isPinned),
        asc(joefromsloPosts.order),
        desc(joefromsloPosts.id),
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
    console.error("joefromslo posts paged query failed:", error);
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }
}
