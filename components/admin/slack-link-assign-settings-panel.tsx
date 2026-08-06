"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SlackLinkAssignSettingsPanel() {
  const [channelId, setChannelId] = useState("");
  const [savedChannelId, setSavedChannelId] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slack-link-assign");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        channelId?: string;
        updatedAt?: string | null;
      };
      const value = (data.channelId ?? "").trim();
      setChannelId(value);
      setSavedChannelId(value);
      setUpdatedAt(data.updatedAt ?? null);
    } catch {
      toast.error("Could not load Slack channel settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/slack-link-assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        channelId?: string;
        updatedAt?: string | null;
      };
      if (!res.ok) {
        if (res.status === 403) {
          setCanEdit(false);
          throw new Error("Only staff admins can update this setting.");
        }
        throw new Error(data.error || "Save failed");
      }
      const value = (data.channelId ?? "").trim();
      setChannelId(value);
      setSavedChannelId(value);
      setUpdatedAt(data.updatedAt ?? null);
      toast.success("Slack channel saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dirty = channelId.trim() !== savedChannelId;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Slack link assign
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which Slack channel the bot watches for X/Twitter links. No env
          var needed for the channel ID.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="slack-assign-channel-id">Channel ID</Label>
          <Input
            id="slack-assign-channel-id"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="e.g. C012ABCDEF"
            disabled={loading || saving || !canEdit}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            In Slack: open the channel → click the channel name → About → copy
            Channel ID at the bottom. Invite the bot to that channel.
          </p>
          {updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last saved {new Date(updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading || saving || !dirty || !canEdit}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save channel"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading || saving || !dirty}
            onClick={() => setChannelId(savedChannelId)}
          >
            Reset
          </Button>
        </div>
      </section>
    </main>
  );
}
