import type { Metadata } from "next";
import { StaffLoginForm } from "@/components/admin/staff-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Staff accounts only. Reader accounts use the main site sign-in.
        </p>
      </div>
      <StaffLoginForm />
    </div>
  );
}
