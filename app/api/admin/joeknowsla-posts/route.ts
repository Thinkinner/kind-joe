import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { joeknowslaPosts } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_POST_FEED_PATHS = ["/posts", "/ventura/posts", "/joeknowsla/posts", "/joefromslo/posts", "/oxnard/posts"] as const;

function revalidatePublicPostFeeds() {
  for (const path of PUBLIC_POST_FEED_PATHS) {
    revalidatePath(path);
  }
}

function isMissingJoeKnowsLaPostsTable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('relation "joeknowsla_posts" does not exist');
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
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
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

  try {
    const data = await db
      .select()
      .from(joeknowslaPosts)
      .orderBy(desc(joeknowslaPosts.isPinned), desc(joeknowslaPosts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(data);
  } catch (error) {
    if (isMissingJoeKnowsLaPostsTable(error)) {
      return NextResponse.json(
        {
          error:
            "joeknowsla_posts table is missing. Run DB migrations to enable JoeKnowsLA posts.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
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

  try {
    const [row] = await db
      .insert(joeknowslaPosts)
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
  } catch (error) {
    if (isMissingJoeKnowsLaPostsTable(error)) {
      return NextResponse.json(
        {
          error:
            "joeknowsla_posts table is missing. Run DB migrations to enable JoeKnowsLA posts.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
