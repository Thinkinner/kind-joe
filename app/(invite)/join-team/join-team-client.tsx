"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function JoinTeamClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const [meta, setMeta] = useState<{
    email: string;
    staffRole: string;
    hasCustomAccess: boolean;
    hasAccount: boolean;
    signedIn: boolean;
    sessionEmailMatchesInvite: boolean;
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const MIN_PASSWORD = 12;

  useEffect(() => {
    if (!token) return;
    setMetaLoading(true);
    setMessage("");
    setAuthError("");
    void (async () => {
      try {
        const res = await fetch(
          `/api/invitations/accept?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(j.error || "Could not load invitation.");
        }
        setMeta(j);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Could not load invitation.");
      } finally {
        setMetaLoading(false);
      }
    })();
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Could not accept invitation.");
      }
      setStatus("done");
      setMessage("You’re on the team. Redirecting to the admin…");
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const signInAndAccept = async () => {
    if (!meta) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const signInRes = await authClient.signIn.email({
        email: meta.email,
        password,
        rememberMe: true,
      });
      if (signInRes.error) {
        throw new Error("Invalid password for this invited email.");
      }
      await accept();
    } catch (e) {
      setAuthError(
        e instanceof Error ? e.message : "Could not sign in and accept invite.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const registerAndAccept = async () => {
    if (!meta) return;
    setAuthError("");
    if (password.length < MIN_PASSWORD) {
      setAuthError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthLoading(true);
    try {
      const signUpRes = await authClient.signUp.email({
        email: meta.email,
        password,
        name: name.trim(),
        callbackURL: `${window.location.origin}/join-team?token=${encodeURIComponent(token)}`,
      });
      if (signUpRes.error) {
        throw new Error("Could not create account for this invitation.");
      }
      await accept();
    } catch (e) {
      setAuthError(
        e instanceof Error ? e.message : "Could not create account and accept invite.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-neutral-600">
        Missing invitation token. Open the link from your email.
      </p>
    );
  }

  if (status === "done") {
    return <p className="text-sm text-emerald-700">{message}</p>;
  }

  if (metaLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invitation...
      </div>
    );
  }

  if (!meta) {
    return null;
  }

  const canAcceptDirectly = meta.signedIn && meta.sessionEmailMatchesInvite;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Invited email: <span className="font-medium text-neutral-900">{meta.email}</span>
      </p>
      <p className="text-sm text-neutral-600">
        Access level:{" "}
        <span className="font-medium text-neutral-900 capitalize">
          {meta.staffRole}
        </span>
        {meta.hasCustomAccess ? " + custom page access" : ""}
      </p>

      {canAcceptDirectly ? (
        <Button
          type="button"
          onClick={() => void accept()}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting…
            </>
          ) : (
            "Accept invitation"
          )}
        </Button>
      ) : meta.hasAccount ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void signInAndAccept();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-password">Password</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={authLoading || status === "loading"}>
            {authLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in and accept"
            )}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void registerAndAccept();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-new-password">Password</Label>
            <Input
              id="invite-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-confirm-password">Confirm Password</Label>
            <Input
              id="invite-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_PASSWORD}
              required
            />
          </div>
          <Button type="submit" disabled={authLoading || status === "loading"}>
            {authLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account and accept"
            )}
          </Button>
        </form>
      )}

      {authError && (
        <p className="text-sm text-red-700" role="alert">
          {authError}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
