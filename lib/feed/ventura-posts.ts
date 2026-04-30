import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { venturaPosts } from "@/db/schema";

export type VenturaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

export type VenturaPost = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type VenturaPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

export async function listVenturaPosts(): Promise<VenturaPost[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await db
      .select({
        id: venturaPosts.id,
        imageUrl: venturaPosts.imageUrl,
        destinationUrl: venturaPosts.destinationUrl,
        caption: venturaPosts.caption,
        isPinned: venturaPosts.isPinned,
        order: venturaPosts.order,
        isActive: venturaPosts.isActive,
        createdAt: venturaPosts.createdAt,
      })
      .from(venturaPosts)
      .where(or(eq(venturaPosts.isActive, true), isNull(venturaPosts.isActive)))
      .orderBy(
        desc(venturaPosts.isPinned),
        asc(venturaPosts.order),
        desc(venturaPosts.id),
      );

    return rows;
  } catch (error) {
    console.error("ventura posts query failed:", error);
    return [];
  }
}

export async function listVenturaPostCards(): Promise<VenturaPostCard[]> {
  const rows = await listVenturaPosts();
  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    destinationUrl: row.destinationUrl,
  }));
}

export async function listVenturaPostsPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<VenturaPage<VenturaPost>> {
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
        id: venturaPosts.id,
        imageUrl: venturaPosts.imageUrl,
        destinationUrl: venturaPosts.destinationUrl,
        caption: venturaPosts.caption,
        isPinned: venturaPosts.isPinned,
        order: venturaPosts.order,
        isActive: venturaPosts.isActive,
        createdAt: venturaPosts.createdAt,
      })
      .from(venturaPosts)
      .where(or(eq(venturaPosts.isActive, true), isNull(venturaPosts.isActive)))
      .orderBy(
        desc(venturaPosts.isPinned),
        asc(venturaPosts.order),
        desc(venturaPosts.id),
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
    console.error("ventura posts paged query failed:", error);
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }
}
