import { StaffTwoFactorSettings } from "@/components/admin/staff-two-factor-settings";
import { StaffAliasSettings } from "@/components/admin/staff-alias-settings";
import Link from "next/link";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Profile settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Manage your profile name, public byline alias, password, and account
          security options.
        </p>
        <p className="mt-2 text-sm text-foreground">
          Need to update your password?{" "}
          <Link
            href="/force-password-change?next=/admin/security"
            className="font-medium underline underline-offset-2"
          >
            Change password
          </Link>
          .
        </p>
      </div>
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">Name & alias</h2>
        <div className="mt-4">
          <StaffAliasSettings />
        </div>
      </section>
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">
          Authenticator (TOTP)
        </h2>
        <div className="mt-4">
          <StaffTwoFactorSettings />
        </div>
      </section>
    </div>
  );
}
