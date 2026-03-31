"use client";

import { useState } from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "idle" | "showQr";

export function StaffTwoFactorSettings() {
  const { data, isPending, refetch } = authClient.useSession();
  const user = data?.user as
    | { twoFactorEnabled?: boolean; email?: string }
    | undefined;
  const enabled = Boolean(user?.twoFactorEnabled);

  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  async function onStartEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.twoFactor.enable({
        password: password.trim(),
        issuer: "Kind Joe",
      });
      if (res.error) {
        toast.error("Could not start two-factor setup.");
        return;
      }
      const d = res.data as { totpURI?: string; backupCodes?: string[] } | undefined;
      if (!d?.totpURI) {
        toast.error("Unexpected response from server.");
        return;
      }
      setTotpUri(d.totpURI);
      setBackupCodes(Array.isArray(d.backupCodes) ? d.backupCodes : []);
      setStep("showQr");
      setPassword("");
      toast.message("Scan the QR code, then enter a code to finish.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = verifyCode.replace(/\D/g, "");
    if (code.length < 6) {
      toast.error("Enter the 6-digit code from your app.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: false,
      });
      if (res.error) {
        toast.error("That code did not work. Try again.");
        return;
      }
      toast.success("Two-factor authentication is on.");
      setStep("idle");
      setTotpUri(null);
      setBackupCodes([]);
      setVerifyCode("");
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!disablePassword.trim()) {
      toast.error("Enter your password to turn off 2FA.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.twoFactor.disable({
        password: disablePassword.trim(),
      });
      if (res.error) {
        toast.error("Could not disable two-factor.");
        return;
      }
      toast.success("Two-factor authentication is off.");
      setDisablePassword("");
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  if (enabled && step !== "showQr") {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-sm text-slate-600">
          Two-factor authentication is enabled on your account. Sign-in will ask
          for an authenticator code after your password.
        </p>
        <form onSubmit={onDisable} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="2fa-disable-pw">Password</Label>
            <Input
              id="2fa-disable-pw"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? "Working…" : "Turn off two-factor"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "showQr" && totpUri) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-sm text-slate-600">
          Add this account to your authenticator app, then enter a 6-digit code
          to confirm.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mx-auto w-fit bg-white p-2">
            <QRCode value={totpUri} size={180} />
          </div>
        </div>
        {backupCodes.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-medium text-amber-900">
              Save these backup codes somewhere safe — each works once.
            </p>
            <ul className="mt-2 font-mono text-xs text-amber-950">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <form onSubmit={onVerify} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="2fa-verify">Authenticator code</Label>
            <Input
              id="2fa-verify"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Confirm and enable"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setStep("idle");
                setTotpUri(null);
                setBackupCodes([]);
                setVerifyCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-slate-600">
        Use an authenticator app (1Password, Google Authenticator, etc.) for a
        second step when signing in to admin.
      </p>
      <form onSubmit={onStartEnable} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="2fa-enable-pw">Account password</Label>
          <Input
            id="2fa-enable-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : "Set up authenticator"}
        </Button>
      </form>
    </div>
  );
}
