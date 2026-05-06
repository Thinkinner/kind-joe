import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { joeknowslaPosts } from "@/db/schema";

export type JoeKnowsLaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

export type JoeKnowsLaPost = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type JoeKnowsLaPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

export async function listJoeKnowsLaPosts(): Promise<JoeKnowsLaPost[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await db
      .select({
        id: joeknowslaPosts.id,
        imageUrl: joeknowslaPosts.imageUrl,
        destinationUrl: joeknowslaPosts.destinationUrl,
        caption: joeknowslaPosts.caption,
        isPinned: joeknowslaPosts.isPinned,
        order: joeknowslaPosts.order,
        isActive: joeknowslaPosts.isActive,
        createdAt: joeknowslaPosts.createdAt,
      })
      .from(joeknowslaPosts)
      .where(
        or(eq(joeknowslaPosts.isActive, true), isNull(joeknowslaPosts.isActive)),
      )
      .orderBy(
        desc(joeknowslaPosts.isPinned),
        asc(joeknowslaPosts.order),
        desc(joeknowslaPosts.id),
      );

    return rows;
  } catch (error) {
    console.error("joeknowsla posts query failed:", error);
    return [];
  }
}

export async function listJoeKnowsLaPostCards(): Promise<JoeKnowsLaPostCard[]> {
  const rows = await listJoeKnowsLaPosts();
  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    destinationUrl: row.destinationUrl,
  }));
}

export async function listJoeKnowsLaPostsPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<JoeKnowsLaPage<JoeKnowsLaPost>> {
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
        id: joeknowslaPosts.id,
        imageUrl: joeknowslaPosts.imageUrl,
        destinationUrl: joeknowslaPosts.destinationUrl,
        caption: joeknowslaPosts.caption,
        isPinned: joeknowslaPosts.isPinned,
        order: joeknowslaPosts.order,
        isActive: joeknowslaPosts.isActive,
        createdAt: joeknowslaPosts.createdAt,
      })
      .from(joeknowslaPosts)
      .where(
        or(eq(joeknowslaPosts.isActive, true), isNull(joeknowslaPosts.isActive)),
      )
      .orderBy(
        desc(joeknowslaPosts.isPinned),
        asc(joeknowslaPosts.order),
        desc(joeknowslaPosts.id),
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
    console.error("joeknowsla posts paged query failed:", error);
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }
}
