"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildUniqueAliasSuggestion } from "@/lib/auth/alias-name-suggestions";

type ProfileResponse = {
  aliasFullName?: string | null;
  name?: string | null;
};

export function StaffAliasSettings() {
  const [aliasFullName, setAliasFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const [suggestedAlias, setSuggestedAlias] = useState("");
  const [suggestingAlias, setSuggestingAlias] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aliasLocked, setAliasLocked] = useState(false);

  const applySuggestion = (nextSuggestion: string) => {
    if (!nextSuggestion.trim()) return;
    setSuggestedAlias(nextSuggestion);
    setUsedSuggestions((prev) =>
      prev.includes(nextSuggestion) ? prev : [...prev, nextSuggestion],
    );
  };

  const requestGeminiSuggestion = async (
    seedName: string,
    usedList: string[],
    fallback: string,
  ) => {
    setSuggestingAlias(true);
    try {
      const res = await fetch("/api/admin/profile/alias-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: seedName,
          used: usedList,
          seed: `${seedName}-${Date.now()}-${Math.random()}`,
        }),
      });
      if (!res.ok) {
        throw new Error("Gemini alias suggestion unavailable.");
      }
      const data = (await res.json()) as { alias?: string | null };
      const alias = (data.alias ?? "").trim();
      applySuggestion(alias || fallback);
    } catch {
      applySuggestion(fallback);
    } finally {
      setSuggestingAlias(false);
    }
  };

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
        if (existingAlias.length === 0) {
          const localSuggestion = buildUniqueAliasSuggestion(existingName, []);
          applySuggestion(localSuggestion);
          void requestGeminiSuggestion(existingName, [localSuggestion], localSuggestion);
        }
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

    const requestPayload: { name: string; aliasFullName?: string } = {
      name: trimmedName,
    };

    if (!aliasLocked) {
      const trimmedAlias = aliasFullName.trim();
      if (!trimmedAlias) {
        toast.error("Enter an alias full name.");
        return;
      }
      requestPayload.aliasFullName = trimmedAlias;
    }

    if (aliasLocked && trimmedName === savedDisplayName.trim()) {
      toast.message("Nothing to update.");
      return;
    }

    if (!aliasLocked && !requestPayload.aliasFullName) {
      toast.error("Enter an alias full name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const responsePayload = (await res.json().catch(() => ({}))) as {
        error?: string | Record<string, unknown>;
        aliasFullName?: string | null;
        name?: string | null;
      };
      if (!res.ok) {
        throw new Error(
          typeof responsePayload.error === "string"
            ? responsePayload.error
            : "Could not save alias settings.",
        );
      }
      setDisplayName((responsePayload.name ?? trimmedName).trim());
      setSavedDisplayName((responsePayload.name ?? trimmedName).trim());
      if (!aliasLocked && responsePayload.aliasFullName) {
        setAliasFullName(responsePayload.aliasFullName.trim());
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
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={onSave} className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">
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
          <div className="border-l-2 border-border pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI alias assistant
            </p>
            <p className="mt-1 text-sm text-foreground">
              Suggested realistic pen name:{" "}
              <span className="font-semibold text-foreground">
                {suggestedAlias || "Click below for a suggestion"}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              disabled={suggestingAlias}
              onClick={() => {
                const randomSeed = `${displayName}-${Date.now()}-${Math.random()}`;
                const localSuggestion = buildUniqueAliasSuggestion(
                  randomSeed,
                  usedSuggestions,
                  displayName,
                );
                applySuggestion(localSuggestion);
                void requestGeminiSuggestion(
                  displayName || randomSeed,
                  [...usedSuggestions, localSuggestion],
                  localSuggestion,
                );
              }}
            >
              {suggestingAlias ? "Gemini thinking..." : "Try another suggestion"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!suggestedAlias) return;
                setAliasFullName(suggestedAlias);
              }}
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
