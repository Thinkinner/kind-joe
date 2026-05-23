import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clicks, posts } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_POST_FEED_PATHS = ["/posts", "/ventura/posts", "/joeknowsla/posts"] as const;

function revalidatePublicPostFeeds() {
  for (const path of PUBLIC_POST_FEED_PATHS) {
    revalidatePath(path);
  }
}

const CreateSchema = z.object({
  imageUrl: z.string().url(),
  destinationUrl: z.string().url(),
  caption: z.string().optional(),
  isPinned: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const [data, clickRows] = await Promise.all([
    db
      .select()
      .from(posts)
      .orderBy(desc(posts.isPinned), desc(posts.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({
        postId: clicks.postId,
        count: sql<number>`CAST(COUNT(${clicks.id}) AS INT)`,
      })
      .from(clicks)
      .groupBy(clicks.postId),
  ]);

  const clickMap = new Map<number, number>();
  for (const row of clickRows) {
    clickMap.set(row.postId ?? 0, row.count ?? 0);
  }

  return NextResponse.json(
    data.map((row) => ({
      ...row,
      clickCount: clickMap.get(row.id) ?? 0,
    })),
  );
}

export async function POST(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(posts)
    .values({
      imageUrl: parsed.data.imageUrl,
      destinationUrl: parsed.data.destinationUrl,
      caption: parsed.data.caption ?? null,
      isPinned: parsed.data.isPinned ?? false,
      order: parsed.data.order ?? 0,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  revalidatePublicPostFeeds();
  return NextResponse.json(row, { status: 201 });
}
