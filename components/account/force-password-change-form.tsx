"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/account/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD = 12;

const inputClass =
  "h-[52px] min-h-[52px] rounded-2xl border-0 bg-zinc-100/95 px-4 text-[15px] text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-zinc-900/[0.06] transition-[background-color,box-shadow] placeholder:text-zinc-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#102A80]/30 focus-visible:ring-offset-0";

const primaryBtnClass =
  "h-[52px] min-h-[52px] w-full rounded-2xl border-0 bg-gradient-to-b from-[#1e3d9e] to-[#102A80] text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-6px_rgba(16,42,128,0.55)] transition-[transform,box-shadow,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none";

export function ForcePasswordChangeForm({
  nextPath,
}: {
  nextPath: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_PASSWORD) {
      setError(`New password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Please choose a different password than the temporary password.");
      return;
    }

    setPending(true);
    try {
      const change = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (change.error) {
        setError(change.error.message ?? "Could not update password.");
        setPending(false);
        return;
      }

      const finalizeRes = await fetch("/api/account/force-password-change", {
        method: "POST",
      });
      if (!finalizeRes.ok) {
        setError("Password changed but account update failed. Please try again.");
        setPending(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong while updating password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Set a new password"
      description="Use your temporary password once, then set a permanent password now."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="temp-password"
            className="text-[13px] font-medium tracking-wide text-zinc-600"
          >
            Temporary password
          </Label>
          <Input
            id="temp-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="new-password"
            className="text-[13px] font-medium tracking-wide text-zinc-600"
          >
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
            className={inputClass}
          />
          <p className="text-[13px] leading-relaxed text-zinc-500">
            At least {MIN_PASSWORD} characters.
          </p>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="confirm-new-password"
            className="text-[13px] font-medium tracking-wide text-zinc-600"
          >
            Confirm new password
          </Label>
          <Input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
            className={inputClass}
          />
        </div>
        {error ? (
          <p
            className="rounded-2xl bg-red-500/[0.08] px-4 py-3 text-sm leading-relaxed text-red-900 ring-1 ring-red-500/15"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" className={primaryBtnClass} disabled={pending}>
          {pending ? "Updating…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
