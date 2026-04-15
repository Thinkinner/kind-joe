import { StaffTwoFactorSettings } from "@/components/admin/staff-two-factor-settings";
import { StaffAliasSettings } from "@/components/admin/staff-alias-settings";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Security
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Optional two-factor authentication for your staff account. Enable it
          here after you can sign in reliably.
        </p>
      </div>
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Author alias</h2>
        <div className="mt-4">
          <StaffAliasSettings />
        </div>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          Authenticator (TOTP)
        </h2>
        <div className="mt-4">
          <StaffTwoFactorSettings />
        </div>
      </section>
    </div>
  );
}
