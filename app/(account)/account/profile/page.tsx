import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { AuthCard } from "@/components/account/auth-card";
import { ReaderProfileEditor } from "@/components/account/reader-profile-editor";
import { db } from "@/db";
import { socialUserProfiles } from "@/db/schema";
import { requireReaderSession } from "@/lib/auth/server";

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

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ReaderProfilePage() {
  const { user } = await requireReaderSession("/login", "/account/profile");
  const userId = user?.id ?? "";
  const email = user?.email ?? "";
  const initialName = user?.name?.trim() ?? "";
  const initialUsername =
    typeof user?.username === "string" ? user.username.trim() : "";
  const initialImage = typeof user?.image === "string" ? user.image.trim() : "";
  let social: Array<{
    bio: string | null;
    location: string | null;
    websiteUrl: string | null;
  }> = [];
  if (userId) {
    try {
      social = await db
        .select({
          bio: socialUserProfiles.bio,
          location: socialUserProfiles.location,
          websiteUrl: socialUserProfiles.websiteUrl,
        })
        .from(socialUserProfiles)
        .where(eq(socialUserProfiles.userId, userId))
        .limit(1);
    } catch (err) {
      if (!isUndefinedTableError(err)) {
        throw err;
      }
      social = [];
    }
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Profile"
      description="Update your social profile, username, and public details."
    >
      <ReaderProfileEditor
        initialName={initialName}
        initialUsername={initialUsername}
        initialImage={initialImage}
        initialBio={social[0]?.bio ?? ""}
        initialLocation={social[0]?.location ?? ""}
        initialWebsiteUrl={social[0]?.websiteUrl ?? ""}
        email={email}
      />
    </AuthCard>
  );
}
