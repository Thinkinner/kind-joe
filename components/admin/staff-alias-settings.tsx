"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileResponse = {
  aliasFullName?: string | null;
};

export function StaffAliasSettings() {
  const [aliasFullName, setAliasFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load alias settings.");
        const data = (await res.json()) as ProfileResponse;
        if (!active) return;
        setAliasFullName((data.aliasFullName ?? "").trim());
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
    const trimmed = aliasFullName.trim();
    if (!trimmed) {
      toast.error("Enter an alias full name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliasFullName: trimmed }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string | Record<string, unknown>;
        aliasFullName?: string | null;
      };
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Could not save alias settings.",
        );
      }
      setAliasFullName((payload.aliasFullName ?? trimmed).trim());
      toast.success("Alias full name saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save alias settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading...</p>;
  }

  return (
    <form onSubmit={onSave} className="max-w-md space-y-3">
      <p className="text-sm text-slate-600">
        This public alias is used as your article byline instead of your real name.
      </p>
      <div className="space-y-2">
        <Label htmlFor="staff-alias-full-name">Alias full name</Label>
        <Input
          id="staff-alias-full-name"
          value={aliasFullName}
          onChange={(e) => setAliasFullName(e.target.value)}
          maxLength={120}
          autoComplete="nickname"
          placeholder="e.g. City Desk Reporter"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save alias"}
      </Button>
    </form>
  );
}
