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
