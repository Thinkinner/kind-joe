"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  initialImage,
  initialBio,
  initialLocation,
  initialWebsiteUrl,
  email,
}: {
  initialName: string;
  initialUsername: string;
  initialImage: string;
  initialBio: string;
  initialLocation: string;
  initialWebsiteUrl: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [image, setImage] = useState(initialImage);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [savingProfile, setSavingProfile] = useState(false);
  const normalizedUsername = username.trim()
    ? normalizeUsernameInput(username.trim())
    : "";
  const initials = (name.trim() || "You")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

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
      const trimmedImage = image.trim();
      const { error } = await authClient.updateUser({
        name: trimmed,
        username: uRaw.length === 0 ? "" : normalizeUsernameInput(uRaw),
        image: trimmedImage.length === 0 ? undefined : trimmedImage,
      });
      if (error) {
        toast.error(profileUpdateErrorMessage(error));
        return;
      }
      const profileRes = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          location,
          websiteUrl,
        }),
      });
      const profileBody = (await profileRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!profileRes.ok) {
        toast.error(profileBody.error ?? "Could not save profile settings.");
        return;
      }
      toast.success("Profile updated.");
      setName(trimmed);
      setUsername(uRaw.length === 0 ? "" : normalizeUsernameInput(uRaw));
      setImage(trimmedImage);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_-25px_rgba(2,6,23,0.45)]">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-indigo-50 via-white to-rose-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Public profile
          </p>
          <p className="mt-1 text-sm text-slate-600">
            This is how your identity appears around the app.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {name.trim() || "Your display name"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {normalizedUsername ? `@${normalizedUsername}` : "No username set"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{email}</span>. Email cannot
            be changed here.
          </p>
        </div>
      </div>

      <form onSubmit={onSaveProfile} className="space-y-4">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_-25px_rgba(2,6,23,0.45)] sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Identity</h2>
          <p className="mt-1 text-sm text-slate-600">
            Set your display name, profile image URL, and public username.
          </p>

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Display name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                autoComplete="name"
                className="h-11 rounded-lg border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-500">Shown anywhere your name appears.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-image">Profile photo URL</Label>
              <Input
                id="account-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                maxLength={500}
                autoComplete="url"
                placeholder="https://example.com/your-photo.jpg"
                className="h-11 rounded-lg border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-username">Username</Label>
              <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:ring-offset-0">
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
                  className="h-10 border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-slate-500">{describeUsernameRules()}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_-25px_rgba(2,6,23,0.45)] sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Public details</h2>
          <p className="mt-1 text-sm text-slate-600">
            Share a short bio and optional location/website.
          </p>

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="account-bio">Bio</Label>
              <Textarea
                id="account-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                rows={4}
                placeholder="Tell people a bit about yourself."
                className="rounded-lg border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-500">{bio.length}/280 characters</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-location">Location</Label>
                <Input
                  id="account-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={120}
                  placeholder="City, Country"
                  className="h-11 rounded-lg border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-website">Website</Label>
                <Input
                  id="account-website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  maxLength={500}
                  autoComplete="url"
                  placeholder="https://your-site.com"
                  className="h-11 rounded-lg border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-3 z-10 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Your changes are saved to your public profile.</p>
            <Button type="submit" disabled={savingProfile} className="min-w-28 rounded-lg">
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
