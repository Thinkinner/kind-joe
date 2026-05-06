import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialProfileLinks, socialProfiles } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingSocialTables(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const causeMessage =
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    error.cause instanceof Error
      ? error.cause.message.toLowerCase()
      : "";
  const combined = `${message} ${causeMessage}`;
  return (
    (combined.includes("social_profiles") || combined.includes("social_profile_links")) &&
    combined.includes("does not exist")
  );
}

async function resolveProfileHandle(profileId: number): Promise<string | null> {
  const [profile] = await db
    .select({ handle: socialProfiles.handle })
    .from(socialProfiles)
    .where(eq(socialProfiles.id, profileId))
    .limit(1);
  return profile?.handle ?? null;
}

function revalidateProfile(handle: string) {
  revalidatePath(`/profile/${handle}`);
}

const PatchSchema = z.object({
  label: z.string().trim().min(1).max(140).optional(),
  href: z.string().trim().min(1).max(2048).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; linkId: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id, linkId } = await ctx.params;
  const profileId = Number(id);
  const parsedLinkId = Number(linkId);
  if (!Number.isFinite(profileId) || !Number.isFinite(parsedLinkId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
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
  ) as Partial<typeof socialProfileLinks.$inferInsert>;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  try {
    const handle = await resolveProfileHandle(profileId);
    if (!handle) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const [row] = await db
      .update(socialProfileLinks)
      .set(patch)
      .where(
        and(
          eq(socialProfileLinks.id, parsedLinkId),
          eq(socialProfileLinks.profileId, profileId),
        ),
      )
      .returning();

    if (!row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    revalidateProfile(handle);
    return NextResponse.json(row);
  } catch (error) {
    if (isMissingSocialTables(error)) {
      return NextResponse.json(
        {
          error:
            "social profile tables are missing. Run DB migrations to enable Link Tree profiles.",
        },
        { status: 503 },
      );
    }
    console.error("social profile links PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update profile link." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; linkId: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id, linkId } = await ctx.params;
  const profileId = Number(id);
  const parsedLinkId = Number(linkId);
  if (!Number.isFinite(profileId) || !Number.isFinite(parsedLinkId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  try {
    const handle = await resolveProfileHandle(profileId);
    if (!handle) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    await db
      .delete(socialProfileLinks)
      .where(
        and(
          eq(socialProfileLinks.id, parsedLinkId),
          eq(socialProfileLinks.profileId, profileId),
        ),
      );

    revalidateProfile(handle);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingSocialTables(error)) {
      return NextResponse.json(
        {
          error:
            "social profile tables are missing. Run DB migrations to enable Link Tree profiles.",
        },
        { status: 503 },
      );
    }
    console.error("social profile links DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete profile link." }, { status: 500 });
  }
}
