import type { Metadata } from "next";
import Link from "next/link";
import {
  AuthPageFooter,
  authFooterLeadClass,
  authFooterLinkClass,
} from "@/components/account/auth-page-footer";
import { AuthSplitLayout } from "@/components/account/auth-split-layout";
import { ResetPasswordForm } from "@/components/account/password-reset-forms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthSplitLayout mode="reset" imageSide="right">
      <div className="flex flex-col gap-5 sm:gap-6">
        <ResetPasswordForm initialToken={sp.token} initialError={sp.error} />
        <AuthPageFooter>
          <p className={authFooterLeadClass}>
            <Link href="/login" className={authFooterLinkClass}>
              Reader sign-in
            </Link>
          </p>
        </AuthPageFooter>
      </div>
    </AuthSplitLayout>
  );
}
