import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  socialProfileLinks,
  socialProfileSocialLinks,
  socialProfiles,
} from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function defaultLinksForHandle(handle: string) {
  return [
    {
      label: "Submit Your Videos",
      href: `/profile/${handle}/submit`,
      description: "Send in your clips to get featured by our team.",
      order: 0,
      isActive: true,
      isFeatured: true,
      openInNewTab: false,
    },
    {
      label: "Uncensorces Post",
      href: "/posts",
      description: "Read the latest stories, clips, and viral updates.",
      order: 1,
      isActive: true,
      isFeatured: false,
      openInNewTab: false,
    },
  ] as const;
}

function defaultSocialLinks() {
  return [
    { platform: "instagram", label: "Instagram", href: "https://www.instagram.com", order: 0 },
    { platform: "facebook", label: "Facebook", href: "https://www.facebook.com", order: 1 },
    { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com", order: 2 },
    { platform: "website", label: "Website", href: "https://kindjoe.com", order: 3 },
    { platform: "email", label: "Email", href: "mailto:hello@kindjoe.com", order: 4 },
  ] as const;
}

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

const CreateSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Handle can only contain lowercase letters, numbers, and hyphens."),
  displayName: z.string().trim().min(1).max(140),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
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

  try {
    const rows = await db
      .select()
      .from(socialProfiles)
      .orderBy(desc(socialProfiles.isActive), asc(socialProfiles.handle));
    return NextResponse.json(rows);
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
    console.error("social profiles GET failed:", error);
    return NextResponse.json({ error: "Failed to load social profiles." }, { status: 500 });
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
    const [row] = await db.transaction(async (tx) => {
      const [createdProfile] = await tx
        .insert(socialProfiles)
        .values({
          handle: parsed.data.handle,
          displayName: parsed.data.displayName,
          bio: parsed.data.bio?.trim() || null,
          avatarUrl: parsed.data.avatarUrl?.trim() || null,
          isActive: parsed.data.isActive ?? true,
        })
        .returning();

      if (createdProfile) {
        await tx.insert(socialProfileLinks).values(
          defaultLinksForHandle(createdProfile.handle).map((item) => ({
            profileId: createdProfile.id,
            label: item.label,
            href: item.href,
            description: item.description,
            order: item.order,
            isActive: item.isActive,
            isFeatured: item.isFeatured,
            openInNewTab: item.openInNewTab,
          })),
        );

        await tx.insert(socialProfileSocialLinks).values(
          defaultSocialLinks().map((item) => ({
            profileId: createdProfile.id,
            platform: item.platform,
            label: item.label,
            href: item.href,
            order: item.order,
            isActive: true,
            openInNewTab: true,
          })),
        );
      }

      return [createdProfile];
    });
    revalidateProfile(row.handle);
    return NextResponse.json(row, { status: 201 });
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

    console.error("social profiles POST failed:", error);
    return NextResponse.json({ error: "Failed to create social profile." }, { status: 500 });
  }
}
