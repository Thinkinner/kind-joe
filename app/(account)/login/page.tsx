import type { Metadata } from "next";
import Link from "next/link";
import {
  AuthPageFooter,
  authFooterHintClass,
  authFooterLeadClass,
  authFooterLinkClass,
} from "@/components/account/auth-page-footer";
import { AuthSplitLayout } from "@/components/account/auth-split-layout";
import { ReaderLoginForm } from "@/components/account/reader-auth-forms";
import { redirectIfAuthedFromReaderAuthPages } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function ReaderLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; reason?: string; next?: string }>;
}) {
  await redirectIfAuthedFromReaderAuthPages();
  return (
    <AuthSplitLayout mode="signIn" imageSide="right" priorityImage>
      <div className="flex flex-col gap-6 sm:gap-8">
        <ReaderLoginPageInner searchParams={searchParams} />
        <AuthPageFooter>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <p className={authFooterLeadClass}>No account?</p>
            <Link href="/register" className={authFooterLinkClass}>
              Get started
            </Link>
          </div>
          <p className={authFooterHintClass}>
            If you signed up before we used passwords, use Forgot password once to set one.
          </p>
        </AuthPageFooter>
      </div>
    </AuthSplitLayout>
  );
}

async function ReaderLoginPageInner({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; reason?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : "/";
  return (
    <div className="flex flex-col gap-4">
      {sp.reset === "success" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-medium leading-relaxed text-emerald-800 shadow-sm">
          Your password was updated. You can sign in below.
        </div>
      )}
      {sp.reason === "session" && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-50 p-4 text-sm font-medium leading-relaxed text-blue-900 shadow-sm">
          Your session expired or could not be verified. Please sign in again.
        </div>
      )}
      {sp.reason === "staff_only" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-900 shadow-sm">
          That page is for staff. You are signed in with a reader account. Sign in here with a
          staff email if you have one, or ask an admin to grant access.
        </div>
      )}
      <ReaderLoginForm nextPath={nextPath} />
    </div>
  );
}
