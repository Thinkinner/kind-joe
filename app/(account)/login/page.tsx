import type { Metadata } from "next";
import Link from "next/link";
import { ReaderLoginForm } from "@/components/account/reader-auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function ReaderLoginPage() {
  return (
    <div className="space-y-6">
      <ReaderLoginForm />
      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
