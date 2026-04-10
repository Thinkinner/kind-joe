"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { RefObject } from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  AuthTurnstileField,
  isTurnstileEnabled,
} from "@/components/auth/auth-turnstile-field";
import { setAuthTurnstileToken } from "@/lib/auth/turnstile-request";
import { getAccountType } from "@/lib/auth/account-type";
import { stashNavSessionHint } from "@/lib/auth/nav-session-hint";
import { AuthCard } from "@/components/account/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-[52px] w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 text-[15px] text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:bg-zinc-50 focus-visible:border-[#102A80]/50 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#102A80]/10";

const primaryBtnClass =
  "relative flex h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3d9e] to-[#102A80] px-4 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

const MIN_PASSWORD = 12;

function friendlyNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local.replace(/[._-]+/g, " ").trim();
  if (!words) return "Reader";
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

function attachTurnstile(
  turnstileRef: RefObject<TurnstileInstance | null>,
  setError: (s: string | null) => void,
): boolean {
  if (!isTurnstileEnabled()) return true;
  const token = turnstileRef.current?.getResponse();
  if (!token?.trim()) {
    setError("Please complete the security check.");
    return false;
  }
  setAuthTurnstileToken(token);
  return true;
}

function safeNextPath(nextPath: string | undefined): string {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/")) return "/";
  if (nextPath.startsWith("//")) return "/";
  return nextPath;
}

/** Staff and readers share one session; staff default landing after /login is admin. */
function postLoginRedirectPath(user: unknown, nextPath: string | undefined): string {
  const next = safeNextPath(nextPath);
  if (getAccountType(user) === "staff") {
    if (!nextPath?.trim() || next === "/") return "/admin";
    return next;
  }
  return next;
}

function finishReaderSignIn(
  user: unknown,
  _setError: (s: string | null) => void,
  _setPending: (b: boolean) => void,
  _turnstileRef: RefObject<TurnstileInstance | null>,
  nextPath: string | undefined,
): void {
  stashNavSessionHint(user);
  window.location.assign(postLoginRedirectPath(user, nextPath));
}

export function ReaderLoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstile2faRef = useRef<TurnstileInstance | null>(null);
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!attachTurnstile(turnstileRef, setError)) return;
    setPending(true);
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
      });
      if (res.error) {
        setError("Invalid email or password.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      const redirect = (res.data as { twoFactorRedirect?: boolean } | undefined)
        ?.twoFactorRedirect;
      if (redirect) {
        setStep("totp");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      const u =
        res.data?.user ??
        (await authClient.getSession({ query: { disableCookieCache: true } }))
          .data?.user;
      if (!u) {
        setError("Could not complete sign-in. Please try again.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      finishReaderSignIn(u, setError, setPending, turnstileRef, nextPath);
    } catch {
      setError("Something went wrong. Please try again.");
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  async function onSubmitTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!attachTurnstile(turnstile2faRef, setError)) return;
    const code = totpCode.replace(/\D/g, "");
    if (code.length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    try {
      const verifyRes = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: false,
      });
      if (verifyRes.error) {
        setError("Invalid code. Try again.");
        setPending(false);
        turnstile2faRef.current?.reset();
        return;
      }
      const sessionRes = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      const u = sessionRes.data?.user;
      if (!u) {
        setError("Could not complete sign-in. Please try again.");
        setPending(false);
        return;
      }
      finishReaderSignIn(u, setError, setPending, turnstile2faRef, nextPath);
    } catch {
      setError("Something went wrong. Please try again.");
      turnstile2faRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  if (step === "totp") {
    return (
      <AuthCard
        eyebrow="Kind Joe"
        title="Two-step verification"
        description="Enter the code from your authenticator app."
      >
        <form onSubmit={onSubmitTotp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reader-totp">Authenticator code</Label>
            <Input
              id="reader-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              className={inputClass}
              required
            />
          </div>
          {error ? (
            <p
              className="rounded-xl bg-red-50 p-3.5 text-[13.5px] font-medium text-red-800 ring-1 ring-inset ring-red-500/20"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <AuthTurnstileField ref={turnstile2faRef} className="min-h-[65px]" />
          <Button type="submit" className={primaryBtnClass} disabled={pending}>
            {pending ? "Verifying…" : "Continue"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("credentials");
              setTotpCode("");
              setError(null);
            }}
          >
            Back
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Welcome back"
      description="Sign in with your email and password."
    >
      <form onSubmit={onSubmitCredentials} className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="reader-email" className="text-[13px] font-semibold text-zinc-700">
            Email
          </Label>
          <Input
            id="reader-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="reader-password" className="text-[13px] font-semibold text-zinc-700">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[#102A80] underline-offset-4 hover:text-[#0c2260] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="reader-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            className={inputClass}
          />
        </div>
        {error ? (
          <p
            className="rounded-xl bg-red-50 p-3.5 text-[13.5px] font-medium text-red-800 ring-1 ring-inset ring-red-500/20"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <AuthTurnstileField ref={turnstileRef} className="min-h-[65px]" />
        <Button type="submit" className={primaryBtnClass} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function ReaderRegisterForm({ nextPath = "/" }: { nextPath?: string }) {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function publicOrigin(): string {
    if (typeof window !== "undefined") return window.location.origin;
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    const displayName = name.trim() || friendlyNameFromEmail(trimmedEmail);
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!attachTurnstile(turnstileRef, setError)) return;
    setPending(true);
    try {
      const res = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        name: displayName,
        callbackURL: `${publicOrigin()}/`,
      });
      if (res.error) {
        setError("Could not create your account. Try a different email or sign in.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      const payload = res.data as
        | { token?: string | null; user?: unknown }
        | undefined;
      const u0 = payload?.user;
      if (!u0) {
        setError("Could not create your account. Please try again.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      const sessionRes = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      const signedIn =
        Boolean(payload?.token) || Boolean(sessionRes.data?.session);
      if (!signedIn) {
        setError(
          "Could not create your account. If you already use this email, sign in instead.",
        );
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }
      const u = sessionRes.data?.user ?? u0;
      if (getAccountType(u) === "staff") {
        await authClient.signOut();
        setError(
          "This email is already a staff account. Sign in at /admin/login instead of creating a reader account.",
        );
        setPending(false);
        return;
      }
      stashNavSessionHint(u);
      window.location.assign(safeNextPath(nextPath));
    } catch {
      setError("Something went wrong. Please try again.");
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Kind Joe"
      title="Create your account"
      description="Use your email and a strong password (at least 12 characters)."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="reg-name" className="text-[13px] font-semibold text-zinc-700">
            Display name
          </Label>
          <Input
            id="reg-name"
            autoComplete="name"
            placeholder={friendlyNameFromEmail(email.trim())}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="reg-email" className="text-[13px] font-semibold text-zinc-700">
            Email
          </Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="reg-password" className="text-[13px] font-semibold text-zinc-700">
            Password
          </Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            className={inputClass}
          />
          <p className="text-[13px] text-zinc-500">At least {MIN_PASSWORD} characters.</p>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="reg-confirm" className="text-[13px] font-semibold text-zinc-700">
            Confirm password
          </Label>
          <Input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            className={inputClass}
          />
        </div>
        {error ? (
          <p
            className="rounded-xl bg-red-50 p-3.5 text-[13.5px] font-medium text-red-800 ring-1 ring-inset ring-red-500/20"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <AuthTurnstileField ref={turnstileRef} className="min-h-[65px]" />
        <Button type="submit" className={primaryBtnClass} disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      className="flex h-[52px] items-center justify-center rounded-xl border-zinc-200 px-6 text-[15px] font-medium transition-colors hover:bg-zinc-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
