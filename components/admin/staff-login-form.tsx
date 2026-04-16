"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  AuthTurnstileField,
  isTurnstileEnabled,
} from "@/components/auth/auth-turnstile-field";
import { setAuthTurnstileToken } from "@/lib/auth/turnstile-request";
import { getAccountType } from "@/lib/auth/account-type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StaffLoginStep = "credentials" | "totp";

function requiresPasswordChange(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  return (user as { forcePasswordChange?: unknown }).forcePasswordChange === true;
}

export function StaffLoginForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstile2faRef = useRef<TurnstileInstance | null>(null);
  const [step, setStep] = useState<StaffLoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmitCredentials(e: React.FormEvent) {
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
      const signRes = await authClient.signIn.email({
        email,
        password,
      });
      if (signRes.error) {
        setError("Invalid email or password.");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }

      const redirect = (signRes.data as { twoFactorRedirect?: boolean } | undefined)
        ?.twoFactorRedirect;
      if (redirect) {
        setStep("totp");
        setPending(false);
        turnstileRef.current?.reset();
        return;
      }

      const signUser = signRes.data?.user as Record<string, unknown> | undefined;
      let u: unknown = signUser;

      if (!u) {
        const sessionRes = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        u = sessionRes.data?.user;
      }

      if (getAccountType(u) !== "staff") {
        await authClient.signOut();
        setError("This account is not authorized for admin.");
        setPending(false);
        return;
      }
      if (requiresPasswordChange(u)) {
        const qp = new URLSearchParams({ next: "/admin" });
        router.push(`/force-password-change?${qp.toString()}`);
        router.refresh();
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  async function onSubmitTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isTurnstileEnabled()) {
      const token = turnstile2faRef.current?.getResponse();
      if (!token?.trim()) {
        setError("Please complete the security check.");
        return;
      }
      setAuthTurnstileToken(token);
    }
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
      if (getAccountType(u) !== "staff") {
        await authClient.signOut();
        setError("This account is not authorized for admin.");
        setPending(false);
        return;
      }
      if (requiresPasswordChange(u)) {
        const qp = new URLSearchParams({ next: "/admin" });
        router.push(`/force-password-change?${qp.toString()}`);
        router.refresh();
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      turnstile2faRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  if (step === "totp") {
    return (
      <form onSubmit={onSubmitTotp} className="mx-auto max-w-sm space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the code from your authenticator app.
        </p>
        <div className="space-y-2">
          <Label htmlFor="staff-totp">Authenticator code</Label>
          <Input
            id="staff-totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
            maxLength={8}
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <AuthTurnstileField ref={turnstile2faRef} className="min-h-[65px]" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Verifying…" : "Verify and continue"}
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
    );
  }

  return (
    <form onSubmit={onSubmitCredentials} className="mx-auto max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="staff-email">Email</Label>
        <Input
          id="staff-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-password">Password</Label>
        <Input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <AuthTurnstileField ref={turnstileRef} className="min-h-[65px]" />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
