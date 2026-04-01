import type { Metadata } from "next";
import { AuthCard } from "@/components/account/auth-card";
import { ReaderAccountPanel } from "@/components/account/reader-account-panel";

export const metadata: Metadata = {
  title: "Account & security",
  robots: { index: false, follow: false },
};

export default async function ReaderAccountPage() {
  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Account & security"
      description="Manage signed-in devices and account deletion."
    >
      <ReaderAccountPanel />
    </AuthCard>
  );
}
