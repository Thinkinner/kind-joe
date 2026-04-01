"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeUsernameRules,
  normalizeUsernameInput,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "@/lib/auth/username-rules";

function profileUpdateErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Could not update your profile.";
}

export function ReaderProfileEditor({
  initialName,
  initialUsername,
  email,
}: {
  initialName: string;
  initialUsername: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [savingProfile, setSavingProfile] = useState(false);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      toast.error("Enter a display name.");
      return;
    }
    if (trimmed.length > 120) {
      toast.error("Name is too long.");
      return;
    }
    const uRaw = username.trim();
    if (uRaw.length > 0) {
      const normalized = normalizeUsernameInput(uRaw);
      if (
        normalized.length < USERNAME_MIN ||
        normalized.length > USERNAME_MAX
      ) {
        toast.error(
          `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
        );
        return;
      }
      if (!USERNAME_PATTERN.test(normalized)) {
        toast.error(
          "Username can only use lowercase letters, numbers, and underscores.",
        );
        return;
      }
    }
    setSavingProfile(true);
    try {
      const { error } = await authClient.updateUser({
        name: trimmed,
        username: uRaw.length === 0 ? "" : normalizeUsernameInput(uRaw),
      });
      if (error) {
        toast.error(profileUpdateErrorMessage(error));
        return;
      }
      toast.success("Profile updated.");
      setName(trimmed);
      setUsername(uRaw.length === 0 ? "" : normalizeUsernameInput(uRaw));
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Signed in as
        </p>
        <p className="mt-1 font-semibold text-slate-900">{email}</p>
        <p className="mt-2 text-xs text-slate-500">
          Email is used to sign in and cannot be changed here.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Profile & settings
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Your display name and public username. Leave username blank to remove
            it.
          </p>
        </div>
        <form onSubmit={onSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Display name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoComplete="name"
            />
            <p className="text-xs text-slate-500">
              Shown across the site where your name appears.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-username">Username</Label>
            <div className="flex items-center gap-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-red-900/25 focus-within:ring-offset-0">
              <span className="shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                @
              </span>
              <Input
                id="account-username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                maxLength={USERNAME_MAX}
                autoComplete="username"
                placeholder="your_handle"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-slate-500">{describeUsernameRules()}</p>
          </div>
          <Button type="submit" size="sm" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>
    </div>
  );
}
