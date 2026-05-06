import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialProfiles } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function revalidateProfile(handle: string) {
  revalidatePath(`/profile/${handle}`);
}

function isMissingSocialProfilesTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const causeMessage =
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    error.cause instanceof Error
      ? error.cause.message.toLowerCase()
      : "";
  const combined = `${message} ${causeMessage}`;
  return combined.includes("social_profiles") && combined.includes("does not exist");
}

const PatchSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Handle can only contain lowercase letters, numbers, and hyphens.")
    .optional(),
  displayName: z.string().trim().min(1).max(140).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().trim().max(2048).nullable().optional(),
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
  const profileId = Number(id);
  if (!Number.isFinite(profileId)) {
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
  ) as Partial<typeof socialProfiles.$inferInsert>;

  try {
    const [existing] = await db
      .select({ handle: socialProfiles.handle })
      .from(socialProfiles)
      .where(eq(socialProfiles.id, profileId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const [row] = await db
      .update(socialProfiles)
      .set(patch)
      .where(eq(socialProfiles.id, profileId))
      .returning();
    if (!row) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    revalidateProfile(existing.handle);
    if (existing.handle !== row.handle) {
      revalidateProfile(row.handle);
    }
    return NextResponse.json(row);
  } catch (error) {
    if (isMissingSocialProfilesTable(error)) {
      return NextResponse.json(
        {
          error:
            "social_profiles table is missing. Run DB migrations to enable Link Tree profiles.",
        },
        { status: 503 },
      );
    }

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("social_profiles_handle_unique")
    ) {
      return NextResponse.json(
        { error: "This handle is already in use." },
        { status: 409 },
      );
    }

    console.error("social profiles PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update social profile." }, { status: 500 });
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
  const profileId = Number(id);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ handle: socialProfiles.handle })
      .from(socialProfiles)
      .where(eq(socialProfiles.id, profileId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    await db.delete(socialProfiles).where(eq(socialProfiles.id, profileId));
    revalidateProfile(existing.handle);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingSocialProfilesTable(error)) {
      return NextResponse.json(
        {
          error:
            "social_profiles table is missing. Run DB migrations to enable Link Tree profiles.",
        },
        { status: 503 },
      );
    }
    console.error("social profiles DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete social profile." }, { status: 500 });
  }
}
