import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
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

const CreateSchema = z.object({
  label: z.string().trim().min(1).max(140),
  href: z.string().trim().min(1).max(2048),
  description: z.string().trim().max(500).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

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
    const handle = await resolveProfileHandle(profileId);
    if (!handle) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(socialProfileLinks)
      .where(eq(socialProfileLinks.profileId, profileId))
      .orderBy(
        desc(socialProfileLinks.isFeatured),
        asc(socialProfileLinks.order),
        desc(socialProfileLinks.id),
      );
    return NextResponse.json(rows);
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
    console.error("social profile links GET failed:", error);
    return NextResponse.json({ error: "Failed to load profile links." }, { status: 500 });
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
      .insert(socialProfileLinks)
      .values({
        profileId,
        label: parsed.data.label,
        href: parsed.data.href,
        description: parsed.data.description?.trim() || null,
        order: parsed.data.order ?? 0,
        isActive: parsed.data.isActive ?? true,
        isFeatured: parsed.data.isFeatured ?? false,
        openInNewTab: parsed.data.openInNewTab ?? false,
      })
      .returning();

    revalidateProfile(handle);
    return NextResponse.json(row, { status: 201 });
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
    console.error("social profile links POST failed:", error);
    return NextResponse.json({ error: "Failed to create profile link." }, { status: 500 });
  }
}
