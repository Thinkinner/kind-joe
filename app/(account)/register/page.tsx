import type { Metadata } from "next";
import Link from "next/link";
import { ReaderRegisterForm } from "@/components/account/reader-auth-forms";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

export default function ReaderRegisterPage() {
  return (
    <div className="space-y-6">
      <ReaderRegisterForm />
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
