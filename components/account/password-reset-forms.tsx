"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  AuthTurnstileField,
  isTurnstileEnabled,
} from "@/components/auth/auth-turnstile-field";
import { setAuthTurnstileToken } from "@/lib/auth/turnstile-request";
import { AuthCard } from "@/components/account/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "h-[52px] min-h-[52px] rounded-2xl border-0 bg-zinc-100/95 px-4 text-[15px] text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-zinc-900/[0.06] transition-[background-color,box-shadow] placeholder:text-zinc-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#102A80]/30 focus-visible:ring-offset-0";

const primaryBtnClass =
  "h-[52px] min-h-[52px] w-full rounded-2xl border-0 bg-gradient-to-b from-[#1e3d9e] to-[#102A80] text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-6px_rgba(16,42,128,0.55)] transition-[transform,box-shadow,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none";

const outlineBtnClass =
  "h-[52px] min-h-[52px] w-full rounded-2xl border-zinc-200/90 bg-white text-[15px] font-medium shadow-sm ring-1 ring-zinc-900/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50";

function publicOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function ForgotPasswordForm() {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isTurnstileEnabled()) {
      const token = turnstileRef.current?.getResponse();
      if (!token?.trim()) {
        setError("Please complete the security check.");
        return;
      }
      setAuthTurnstileToken(token);
    }
    setPending(true);
    try {
      const redirectTo = `${publicOrigin()}/reset-password`;
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });
      if (res.error) {
        setError("Could not complete that request. Please try again.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong.");
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <AuthCard
        eyebrow="Kind Joe"
        title="Check your email"
        description="If we can send a reset link to that address, you should receive it shortly."
      >
        <p className="mb-5 rounded-2xl bg-zinc-50/90 px-5 py-5 text-center text-sm text-zinc-700 ring-1 ring-zinc-900/[0.05] sm:px-6">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Sent to
          </span>
          <span className="mt-2 block break-all text-[15px] font-semibold tracking-tight text-zinc-950">
            {email}
          </span>
        </p>
        <Button type="button" variant="outline" className={outlineBtnClass} asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Forgot password"
      description="Enter the email for your staff account. If it matches an account we can reset, we will email a link."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-[13px] font-medium tracking-wide text-zinc-600">
            Email
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <AuthTurnstileField ref={turnstileRef} className="min-h-[65px]" />
        <Button type="submit" className={primaryBtnClass} disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm({
  initialToken,
  initialError,
}: {
  initialToken?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "INVALID_TOKEN"
      ? "This reset link is invalid or has expired. Request a new one."
      : initialError
        ? "Something went wrong with this link."
        : null,
  );
  const [pending, setPending] = useState(false);

  const token = initialToken?.trim() ?? "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    setPending(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (res.error) {
        setError(res.error.message ?? "Could not reset password");
        setPending(false);
        return;
      }
      router.push("/login?reset=success");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (!token && !initialError) {
    return (
      <AuthCard
        eyebrow="Kind Joe"
        title="Reset password"
        description="Open this page from the link in your reset email."
      >
        <Button variant="outline" className={outlineBtnClass} asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Choose a new password"
      description="Use at least 12 characters. Sign in afterward with your email and this password."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-password" className="text-[13px] font-medium tracking-wide text-zinc-600">
            New password
          </Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className={inputClass}
          />
          <p className="text-[13px] leading-relaxed text-zinc-500">
            At least 12 characters. You will sign in with email and this password.
          </p>
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
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
