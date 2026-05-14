"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROMPT_SETTINGS_DEFAULTS,
  type PromptSettingKey,
  type PromptSettings,
} from "@/lib/ai/prompt-settings";

type PromptGroupItem = {
  key: PromptSettingKey;
  label: string;
  help: string;
  rows?: number;
};

type PromptGroup = {
  id: string;
  label: string;
  description: string;
  items: PromptGroupItem[];
};

type PromptSettingsApiPayload = {
  prompts?: PromptSettings;
  groups?: PromptGroup[];
};

export function PromptSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<PromptGroup[]>([]);
  const [prompts, setPrompts] = useState<PromptSettings>({
    ...PROMPT_SETTINGS_DEFAULTS,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/prompt-settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load prompt settings");
        const payload = (await res.json()) as PromptSettingsApiPayload;
        if (cancelled) return;
        setPrompts({ ...PROMPT_SETTINGS_DEFAULTS, ...(payload.prompts ?? {}) });
        setGroups(Array.isArray(payload.groups) ? payload.groups : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const value = prompts[item.key] ?? "";
          return (
            item.label.toLowerCase().includes(term) ||
            item.help.toLowerCase().includes(term) ||
            item.key.toLowerCase().includes(term) ||
            value.toLowerCase().includes(term)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, prompts, query]);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prompt-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts }),
      });
      if (!res.ok) throw new Error("Could not save prompt settings");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading prompt settings...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prompt Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage all newsletter and article-writer prompts in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setPrompts({ ...PROMPT_SETTINGS_DEFAULTS })}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            Reset all defaults
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save prompts"}
          </Button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompt keys, labels, or content..."
          className="pl-9"
        />
      </div>

      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-5">
              {group.items.map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPrompts((prev) => ({
                          ...prev,
                          [item.key]: PROMPT_SETTINGS_DEFAULTS[item.key],
                        }))
                      }
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.help} <span className="font-mono">({item.key})</span>
                  </p>
                  <Textarea
                    value={prompts[item.key]}
                    onChange={(event) =>
                      setPrompts((prev) => ({
                        ...prev,
                        [item.key]: event.target.value,
                      }))
                    }
                    rows={item.rows ?? 6}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
