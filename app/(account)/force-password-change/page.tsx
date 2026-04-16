import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AuthSplitLayout } from "@/components/account/auth-split-layout";
import { ForcePasswordChangeForm } from "@/components/account/force-password-change-form";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { isStaffAccount } from "@/lib/auth/account-type";
import { getServerSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Set new password",
  robots: { index: false, follow: false },
};

function safeNextPath(nextPath: string | undefined, fallback: string): string {
  if (!nextPath) return fallback;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return fallback;
  return nextPath;
}

export default async function ForcePasswordChangePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login?next=/force-password-change");
  }

  const user = session.user;
  const [row] = await db
    .select({
      forcePasswordChange: authUser.forcePasswordChange,
      accountType: authUser.accountType,
    })
    .from(authUser)
    .where(eq(authUser.id, user.id))
    .limit(1);

  const fallback = isStaffAccount({
    accountType: row?.accountType ?? (user as { accountType?: string }).accountType,
  })
    ? "/admin"
    : "/";

  if (!row?.forcePasswordChange) {
    redirect(fallback);
  }

  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next, fallback);

  return (
    <AuthSplitLayout mode="recover" imageSide="right">
      <ForcePasswordChangeForm nextPath={nextPath} />
    </AuthSplitLayout>
  );
}
