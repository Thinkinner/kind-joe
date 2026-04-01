import type { Metadata } from "next";
import { AuthCard } from "@/components/account/auth-card";
import { ReaderProfileEditor } from "@/components/account/reader-profile-editor";
import { requireReaderSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ReaderProfilePage() {
  const { user } = await requireReaderSession("/login", "/account/profile");
  const email = user?.email ?? "";
  const initialName = user?.name?.trim() ?? "";
  const initialUsername =
    typeof user?.username === "string" ? user.username.trim() : "";

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Profile"
      description="Update your display name and public username."
    >
      <ReaderProfileEditor
        initialName={initialName}
        initialUsername={initialUsername}
        email={email}
      />
    </AuthCard>
  );
}
