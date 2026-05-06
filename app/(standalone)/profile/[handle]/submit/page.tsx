import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ClipSubmissionForm } from "@/components/social-profiles/clip-submission-form";
import { db } from "@/db";
import { socialProfiles } from "@/db/schema";

async function getProfileDisplayName(handle: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) {
    return handle === "kindjoe" ? "KindJoe" : null;
  }

  try {
    const [profile] = await db
      .select({ displayName: socialProfiles.displayName })
      .from(socialProfiles)
      .where(and(eq(socialProfiles.handle, handle), eq(socialProfiles.isActive, true)))
      .limit(1);

    return profile?.displayName ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("social_profiles") && handle === "kindjoe") {
      return "KindJoe";
    }
    console.error("social profile submit query failed:", error);
    return null;
  }
}

export default async function SocialProfileSubmitPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const normalizedHandle = handle.trim().toLowerCase();
  const displayName = await getProfileDisplayName(normalizedHandle);

  if (!displayName) {
    notFound();
  }

  return <ClipSubmissionForm handle={normalizedHandle} displayName={displayName} />;
}
