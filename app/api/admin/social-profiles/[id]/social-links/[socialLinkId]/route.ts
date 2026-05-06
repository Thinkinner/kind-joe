import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialProfileSocialLinks, socialProfiles } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  platform: z.string().trim().min(1).max(40).optional(),
  label: z.string().trim().min(1).max(80).optional(),
  href: z.string().trim().min(1).max(2048).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

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
    (combined.includes("social_profiles") ||
      combined.includes("social_profile_social_links")) &&
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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; socialLinkId: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id, socialLinkId } = await ctx.params;
  const profileId = Number(id);
  const linkId = Number(socialLinkId);
  if (!Number.isFinite(profileId) || !Number.isFinite(linkId)) {
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
  ) as Partial<typeof socialProfileSocialLinks.$inferInsert>;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  try {
    const handle = await resolveProfileHandle(profileId);
    if (!handle) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const [row] = await db
      .update(socialProfileSocialLinks)
      .set(patch)
      .where(
        and(
          eq(socialProfileSocialLinks.id, linkId),
          eq(socialProfileSocialLinks.profileId, profileId),
        ),
      )
      .returning();

    if (!row) return NextResponse.json({ error: "Social link not found." }, { status: 404 });
    revalidatePath(`/profile/${handle}`);
    return NextResponse.json(row);
  } catch (error) {
    if (isMissingSocialTables(error)) {
      return NextResponse.json(
        {
          error:
            "social profile social-links table is missing. Run DB migrations to enable social icon management.",
        },
        { status: 503 },
      );
    }
    console.error("social profile social-links PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update social link." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; socialLinkId: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_POSTS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id, socialLinkId } = await ctx.params;
  const profileId = Number(id);
  const linkId = Number(socialLinkId);
  if (!Number.isFinite(profileId) || !Number.isFinite(linkId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  try {
    const handle = await resolveProfileHandle(profileId);
    if (!handle) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    await db
      .delete(socialProfileSocialLinks)
      .where(
        and(
          eq(socialProfileSocialLinks.id, linkId),
          eq(socialProfileSocialLinks.profileId, profileId),
        ),
      );

    revalidatePath(`/profile/${handle}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingSocialTables(error)) {
      return NextResponse.json(
        {
          error:
            "social profile social-links table is missing. Run DB migrations to enable social icon management.",
        },
        { status: 503 },
      );
    }
    console.error("social profile social-links DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete social link." }, { status: 500 });
  }
}
