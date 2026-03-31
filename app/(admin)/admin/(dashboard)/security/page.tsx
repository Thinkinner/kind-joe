import { StaffTwoFactorSettings } from "@/components/admin/staff-two-factor-settings";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Security
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Optional two-factor authentication for your staff account. Enable it
          here after you can sign in reliably.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">
          Authenticator (TOTP)
        </h2>
        <div className="mt-4">
          <StaffTwoFactorSettings />
        </div>
      </section>
    </div>
  );
}
