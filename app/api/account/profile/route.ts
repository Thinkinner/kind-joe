import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialUserProfiles } from "@/db/schema";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";

const updateSchema = z.object({
  bio: z.string().trim().max(280).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  websiteUrl: z.string().trim().max(500).nullable().optional(),
});

function isUndefinedTableError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur; i++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code: unknown }).code === "42P01"
    ) {
      return true;
    }
    cur =
      typeof cur === "object" &&
      cur !== null &&
      "cause" in cur &&
      (cur as { cause: unknown }).cause !== undefined
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

function normalizeOptional(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWebsite(raw: string | null | undefined): string | null {
  const value = normalizeOptional(raw);
  if (!value) return null;
  try {
    const maybe = value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;
    const url = new URL(maybe);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await db
      .select({
        bio: socialUserProfiles.bio,
        location: socialUserProfiles.location,
        websiteUrl: socialUserProfiles.websiteUrl,
      })
      .from(socialUserProfiles)
      .where(eq(socialUserProfiles.userId, user.id))
      .limit(1);

    return NextResponse.json({
      profile: {
        bio: row[0]?.bio ?? null,
        location: row[0]?.location ?? null,
        websiteUrl: row[0]?.websiteUrl ?? null,
      },
    });
  } catch (err) {
    if (isUndefinedTableError(err)) {
      return NextResponse.json({
        profile: {
          bio: null,
          location: null,
          websiteUrl: null,
        },
      });
    }
    console.error("account_profile_get_failed", err);
    return NextResponse.json(
      { error: "Could not load profile settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const bio = normalizeOptional(parsed.data.bio);
    const location = normalizeOptional(parsed.data.location);
    const websiteUrl = normalizeWebsite(parsed.data.websiteUrl);
    if (parsed.data.websiteUrl && !websiteUrl && normalizeOptional(parsed.data.websiteUrl)) {
      return NextResponse.json(
        { error: "Website URL must be a valid http/https URL." },
        { status: 400 },
      );
    }

    await db
      .insert(socialUserProfiles)
      .values({
        userId: user.id,
        bio,
        location,
        websiteUrl,
      })
      .onConflictDoUpdate({
        target: socialUserProfiles.userId,
        set: {
          bio,
          location,
          websiteUrl,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      profile: { bio, location, websiteUrl },
    });
  } catch (err) {
    if (isUndefinedTableError(err)) {
      return NextResponse.json(
        { error: "Profile settings are not set up yet. Run database migrations." },
        { status: 503 },
      );
    }
    console.error("account_profile_patch_failed", err);
    return NextResponse.json(
      { error: "Could not save profile settings." },
      { status: 500 },
    );
  }
}
