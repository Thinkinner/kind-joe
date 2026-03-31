import type { Metadata } from "next";
import { AuthCard } from "@/components/account/auth-card";
import { ReaderAccountPanel } from "@/components/account/reader-account-panel";
import { getServerSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function ReaderAccountPage() {
  const session = await getServerSession();
  const user = session?.user as { name?: string; email?: string } | undefined;
  const email = user?.email ?? "";
  const initialName = user?.name?.trim() ?? "";

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="My account"
      description="You are signed in with your email and password."
    >
      <ReaderAccountPanel initialName={initialName} email={email} />
    </AuthCard>
  );
}
