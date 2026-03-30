import type { Metadata } from "next";
import { SignOutButton } from "@/components/account/reader-auth-forms";
import { getServerSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function ReaderAccountPage() {
  const session = await getServerSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">My account</h1>
      <p className="text-sm text-slate-600">
        Signed in as <span className="font-medium text-slate-900">{user?.email}</span>
        {user?.name ? (
          <>
            {" "}
            ({user.name})
          </>
        ) : null}
      </p>
      <p className="text-sm text-slate-600">
        Reader profile and subscriptions can be added here without touching public
        articles.
      </p>
      <SignOutButton />
    </div>
  );
}
