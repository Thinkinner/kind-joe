"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileResponse = {
  aliasFullName?: string | null;
  name?: string | null;
};

const FIRST_NAMES = [
  "Jordan",
  "Alex",
  "Taylor",
  "Avery",
  "Cameron",
  "Riley",
  "Morgan",
  "Casey",
  "Drew",
  "Logan",
];

const LAST_NAMES = [
  "Coleman",
  "Hayes",
  "Parker",
  "Monroe",
  "Sinclair",
  "Reed",
  "Bennett",
  "Harper",
  "Sullivan",
  "Maddox",
];

function buildAliasSuggestion(seed: string): string {
  const cleaned = seed.trim().replace(/\s+/g, " ");
  const tokens = cleaned
    .split(" ")
    .map((token) => token.replace(/[^a-zA-Z'-]/g, ""))
    .filter(Boolean);
  if (tokens.length >= 2) {
    const first = tokens[0][0]?.toUpperCase() + tokens[0].slice(1).toLowerCase();
    const last = tokens[tokens.length - 1][0]?.toUpperCase() +
      tokens[tokens.length - 1].slice(1).toLowerCase();
    return `${first} ${last}`;
  }

  const seedScore = Array.from(cleaned || `${Date.now()}`).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const first = FIRST_NAMES[seedScore % FIRST_NAMES.length];
  const last = LAST_NAMES[(seedScore * 3) % LAST_NAMES.length];
  return `${first} ${last}`;
}

export function StaffAliasSettings() {
  const [aliasFullName, setAliasFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aliasLocked, setAliasLocked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load alias settings.");
        const data = (await res.json()) as ProfileResponse;
        if (!active) return;
        const existingAlias = (data.aliasFullName ?? "").trim();
        const existingName = (data.name ?? "").trim();
        setAliasFullName(existingAlias);
        setDisplayName(existingName);
        setSavedDisplayName(existingName);
        setAliasLocked(existingAlias.length > 0);
      } catch (err) {
        if (!active) return;
        toast.error(err instanceof Error ? err.message : "Could not load alias settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Enter your display name.");
      return;
    }

    const payload: { name: string; aliasFullName?: string } = {
      name: trimmedName,
    };

    if (!aliasLocked) {
      const trimmedAlias = aliasFullName.trim();
      if (!trimmedAlias) {
        toast.error("Enter an alias full name.");
        return;
      }
      payload.aliasFullName = trimmedAlias;
    }

    if (aliasLocked && trimmedName === savedDisplayName.trim()) {
      toast.message("Nothing to update.");
      return;
    }

    if (!aliasLocked && !payload.aliasFullName) {
      toast.error("Enter an alias full name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string | Record<string, unknown>;
        aliasFullName?: string | null;
        name?: string | null;
      };
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Could not save alias settings.",
        );
      }
      setDisplayName((payload.name ?? trimmedName).trim());
      setSavedDisplayName((payload.name ?? trimmedName).trim());
      if (!aliasLocked && payload.aliasFullName) {
        setAliasFullName(payload.aliasFullName.trim());
        setAliasLocked(true);
      }
      toast.success("Profile settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save alias settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading...</p>;
  }

  const aiSuggestion = buildAliasSuggestion(aliasFullName);

  return (
    <form onSubmit={onSave} className="max-w-md space-y-3">
      <p className="text-sm text-slate-600">
        Set your profile name and public alias for article bylines.
      </p>
      <div className="space-y-2">
        <Label htmlFor="staff-display-name">Display name</Label>
        <Input
          id="staff-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          placeholder="e.g. Benjamin Hayes"
        />
      </div>
      {aliasLocked ? (
        <p className="text-sm font-medium text-amber-700">
          Alias is locked after first save and cannot be changed.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="staff-alias-full-name">Alias full name</Label>
        <Input
          id="staff-alias-full-name"
          value={aliasFullName}
          onChange={(e) => setAliasFullName(e.target.value)}
          disabled={aliasLocked}
          maxLength={120}
          autoComplete="nickname"
          placeholder="e.g. City Desk Reporter"
        />
      </div>
      {!aliasLocked ? (
        <>
          <div className="border-l-2 border-neutral-300 pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              AI alias assistant
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              Suggested realistic pen name:{" "}
              <span className="font-semibold text-neutral-900">{aiSuggestion}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const randomSeed = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
                setAliasFullName(buildAliasSuggestion(randomSeed));
              }}
            >
              Try another suggestion
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAliasFullName(aiSuggestion)}
            >
              Use suggestion
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save name"}
          </Button>
        </div>
      )}
    </form>
  );
}
