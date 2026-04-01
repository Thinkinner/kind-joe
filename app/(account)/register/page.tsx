import type { Metadata } from "next";
import Link from "next/link";
import {
  AuthPageFooter,
  authFooterHintClass,
  authFooterLeadClass,
  authFooterLinkClass,
} from "@/components/account/auth-page-footer";
import { AuthSplitLayout } from "@/components/account/auth-split-layout";
import { ReaderRegisterForm } from "@/components/account/reader-auth-forms";
import { redirectIfAuthedFromReaderAuthPages } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

export default async function ReaderRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await redirectIfAuthedFromReaderAuthPages();
  const sp = await searchParams;
  const nextPath =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : "/";
  return (
    <AuthSplitLayout mode="join" imageSide="right" priorityImage>
      <div className="flex flex-col gap-5 sm:gap-6">
        <ReaderRegisterForm nextPath={nextPath} />
        <AuthPageFooter>
          <p className={authFooterLeadClass}>
            Already have an account?{" "}
            <Link href="/login" className={authFooterLinkClass}>
              Sign in
            </Link>
          </p>
          <p className={authFooterHintClass}>
            We will email you a link to verify your address. You can sign in right
            away after registering.
          </p>
        </AuthPageFooter>
      </div>
    </AuthSplitLayout>
  );
}
