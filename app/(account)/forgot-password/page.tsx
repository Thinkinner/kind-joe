import type { Metadata } from "next";
import Link from "next/link";
import {
  AuthPageFooter,
  authFooterLeadClass,
  authFooterLinkClass,
} from "@/components/account/auth-page-footer";
import { AuthSplitLayout } from "@/components/account/auth-split-layout";
import { ForgotPasswordForm } from "@/components/account/password-reset-forms";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout mode="recover" imageSide="right">
      <div className="flex flex-col gap-5 sm:gap-6">
        <ForgotPasswordForm />
        <AuthPageFooter>
          <p className={authFooterLeadClass}>
            <Link href="/login" className={authFooterLinkClass}>
              Back to reader sign-in
            </Link>
          </p>
        </AuthPageFooter>
      </div>
    </AuthSplitLayout>
  );
}
