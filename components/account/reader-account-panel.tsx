"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/account/reader-auth-forms";

type ListedSession = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string | null;
};

function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent?.trim()) return "This device";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    return "Mobile browser";
  }
  if (ua.includes("mac os")) return "Mac";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "Browser session";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ReaderAccountPanel() {
  const [sessions, setSessions] = useState<ListedSession[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const sessRes = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      setCurrentToken(sessRes.data?.session?.token ?? null);

      const res = await fetch(
        `${window.location.origin}/api/auth/list-sessions`,
        { method: "GET", credentials: "include" },
      );
      if (!res.ok) {
        throw new Error("Could not load sessions");
      }
      const data: unknown = await res.json();
      setSessions(Array.isArray(data) ? (data as ListedSession[]) : []);
    } catch {
      toast.error("Could not load signed-in devices.");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function revokeOne(token: string) {
    setRevoking(token);
    try {
      const res = await fetch(`${window.location.origin}/api/auth/revoke-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        toast.error("Could not sign out that device.");
        return;
      }
      toast.success("Signed out that device.");
      await loadSessions();
    } finally {
      setRevoking(null);
    }
  }

  async function revokeOthers() {
    setRevoking("__others__");
    try {
      const res = await fetch(
        `${window.location.origin}/api/auth/revoke-other-sessions`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) {
        toast.error("Could not sign out other devices.");
        return;
      }
      toast.success("Other devices signed out.");
      await loadSessions();
    } finally {
      setRevoking(null);
    }
  }

  async function requestAccountDeletion() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`${window.location.origin}/api/auth/delete-user`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callbackURL: "/",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        success?: boolean;
      };
      if (!res.ok) {
        toast.error("Could not start account deletion.");
        return;
      }
      if (body.message === "Verification email sent") {
        toast.success("Check your email for a link to confirm deletion.");
        setDeleteOpen(false);
        return;
      }
      toast.success("Request processed.");
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  const otherSessions =
    currentToken != null
      ? sessions.filter((s) => s.token !== currentToken)
      : sessions;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Signed-in devices</h2>
        {loadingSessions ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-600">No other sessions to show.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const isCurrent = currentToken != null && s.token === currentToken;
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-md border border-slate-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {deviceLabel(s.userAgent)}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-normal text-emerald-600">
                          (this device)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      Signed in {formatWhen(s.createdAt)} · Expires{" "}
                      {formatWhen(s.expiresAt)}
                    </p>
                  </div>
                  {!isCurrent ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revoking !== null}
                      onClick={() => void revokeOne(s.token)}
                    >
                      {revoking === s.token ? "Signing out…" : "Sign out"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {otherSessions.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={revoking !== null}
            onClick={() => void revokeOthers()}
          >
            {revoking === "__others__"
              ? "Signing out…"
              : "Sign out all other devices"}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border border-red-100 bg-red-50/40 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
        <p className="text-sm text-slate-600">
          Deleting your account removes your reader profile. We will email you a
          link to confirm.
        </p>
        {!deleteOpen ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteBusy}
              onClick={() => void requestAccountDeletion()}
            >
              {deleteBusy ? "Sending…" : "Email me a confirmation link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleteBusy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <SignOutButton />
    </div>
  );
}
