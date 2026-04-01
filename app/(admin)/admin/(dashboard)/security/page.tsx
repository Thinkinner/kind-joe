import { StaffTwoFactorSettings } from "@/components/admin/staff-two-factor-settings";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Security
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-300">
          Optional two-factor authentication for your staff account. Enable it
          here after you can sign in reliably.
        </p>
      </div>
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_35px_rgba(15,23,42,0.25)]">
        <h2 className="text-lg font-medium text-white">
          Authenticator (TOTP)
        </h2>
        <div className="mt-4">
          <StaffTwoFactorSettings />
        </div>
      </section>
    </div>
  );
}
