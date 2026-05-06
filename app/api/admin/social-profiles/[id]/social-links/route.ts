import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialProfileSocialLinks, socialProfiles } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(2048),
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

export async function GET(
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
  const profileId = Number(id);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(socialProfileSocialLinks)
      .where(eq(socialProfileSocialLinks.profileId, profileId))
      .orderBy(asc(socialProfileSocialLinks.order), asc(socialProfileSocialLinks.id));
    return NextResponse.json(rows);
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
    console.error("social profile social-links GET failed:", error);
    return NextResponse.json({ error: "Failed to load social links." }, { status: 500 });
  }
}

export async function POST(
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
  const profileId = Number(id);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const handle = await resolveProfileHandle(profileId);
    if (!handle) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const [row] = await db
      .insert(socialProfileSocialLinks)
      .values({
        profileId,
        platform: parsed.data.platform,
        label: parsed.data.label,
        href: parsed.data.href,
        order: parsed.data.order ?? 0,
        isActive: parsed.data.isActive ?? true,
        openInNewTab: parsed.data.openInNewTab ?? true,
      })
      .returning();

    revalidatePath(`/profile/${handle}`);
    return NextResponse.json(row, { status: 201 });
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
    console.error("social profile social-links POST failed:", error);
    return NextResponse.json({ error: "Failed to create social link." }, { status: 500 });
  }
}
