import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { venturaPosts } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  imageUrl: z.string().url(),
  destinationUrl: z.string().url(),
  caption: z.string().optional(),
  isPinned: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const data = await db
    .select()
    .from(venturaPosts)
    .orderBy(desc(venturaPosts.isPinned), desc(venturaPosts.createdAt));

  return NextResponse.json(data);
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

  const [row] = await db
    .insert(venturaPosts)
    .values({
      imageUrl: parsed.data.imageUrl,
      destinationUrl: parsed.data.destinationUrl,
      caption: parsed.data.caption ?? null,
      isPinned: parsed.data.isPinned ?? false,
      order: parsed.data.order ?? 0,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
