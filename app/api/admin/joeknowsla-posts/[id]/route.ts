import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { joeknowslaPosts } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_POST_FEED_PATHS = ["/posts", "/ventura/posts", "/joeknowsla/posts", "/joefromslo/posts"] as const;

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

const PatchSchema = z.object({
  imageUrl: z.string().url().optional(),
  destinationUrl: z.string().url().optional(),
  caption: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Partial<typeof joeknowslaPosts.$inferInsert>;

  try {
    const [row] = await db
      .update(joeknowslaPosts)
      .set(patch)
      .where(eq(joeknowslaPosts.id, postId))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidatePublicPostFeeds();
    return NextResponse.json(row);
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

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await db.delete(joeknowslaPosts).where(eq(joeknowslaPosts.id, postId));
    revalidatePublicPostFeeds();
    return NextResponse.json({ ok: true });
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
