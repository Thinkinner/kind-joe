"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DurationUnit = "seconds" | "minutes" | "hours";

const UNIT_SECONDS: Record<DurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
};

function secondsToParts(totalSeconds: number): {
  amount: number;
  unit: DurationUnit;
} {
  const s = Math.max(1, Math.round(totalSeconds));
  if (s % 3600 === 0) return { amount: s / 3600, unit: "hours" };
  if (s % 60 === 0) return { amount: s / 60, unit: "minutes" };
  return { amount: s, unit: "seconds" };
}

function partsToSeconds(amount: number, unit: DurationUnit) {
  const n = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return Math.round(n * UNIT_SECONDS[unit]);
}

function DurationFields(props: {
  id: string;
  label: string;
  hint: string;
  amount: number;
  unit: DurationUnit;
  disabled?: boolean;
  onAmountChange: (amount: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={props.id}
          type="number"
          min={1}
          step={1}
          value={Number.isFinite(props.amount) ? props.amount : ""}
          onChange={(e) => {
            const next = Number(e.target.value);
            props.onAmountChange(Number.isFinite(next) ? next : 0);
          }}
          disabled={props.disabled}
          className="w-28"
        />
        <select
          aria-label={`${props.label} unit`}
          value={props.unit}
          onChange={(e) => props.onUnitChange(e.target.value as DurationUnit)}
          disabled={props.disabled}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="seconds">seconds</option>
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  );
}

export function SlackLinkAssignSettingsPanel() {
  const [channelId, setChannelId] = useState("");
  const [workChannelId, setWorkChannelId] = useState("");
  const [idleAmount, setIdleAmount] = useState(2);
  const [idleUnit, setIdleUnit] = useState<DurationUnit>("hours");
  const [cooldownAmount, setCooldownAmount] = useState(2);
  const [cooldownUnit, setCooldownUnit] = useState<DurationUnit>("hours");

  const [savedChannelId, setSavedChannelId] = useState("");
  const [savedWorkChannelId, setSavedWorkChannelId] = useState("");
  const [savedIdleAfterSeconds, setSavedIdleAfterSeconds] = useState(7200);
  const [savedIdleCooldownSeconds, setSavedIdleCooldownSeconds] =
    useState(7200);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  const applyTiming = (idleAfterSeconds: number, idleCooldownSeconds: number) => {
    const idle = secondsToParts(idleAfterSeconds);
    const cooldown = secondsToParts(idleCooldownSeconds);
    setIdleAmount(idle.amount);
    setIdleUnit(idle.unit);
    setCooldownAmount(cooldown.amount);
    setCooldownUnit(cooldown.unit);
    setSavedIdleAfterSeconds(idleAfterSeconds);
    setSavedIdleCooldownSeconds(idleCooldownSeconds);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slack-link-assign");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        channelId?: string;
        workChannelId?: string;
        idleAfterSeconds?: number;
        idleCooldownSeconds?: number;
        updatedAt?: string | null;
      };
      const assign = (data.channelId ?? "").trim();
      const work = (data.workChannelId ?? "").trim();
      setChannelId(assign);
      setSavedChannelId(assign);
      setWorkChannelId(work);
      setSavedWorkChannelId(work);
      applyTiming(data.idleAfterSeconds ?? 7200, data.idleCooldownSeconds ?? 7200);
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

  const idleAfterSeconds = partsToSeconds(idleAmount, idleUnit);
  const idleCooldownSeconds = partsToSeconds(cooldownAmount, cooldownUnit);

  const save = async () => {
    if (idleAfterSeconds < 1 || idleCooldownSeconds < 1) {
      toast.error("Idle and cooldown must be at least 1 second.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/slack-link-assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          workChannelId,
          idleAfterSeconds,
          idleCooldownSeconds,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        channelId?: string;
        workChannelId?: string;
        idleAfterSeconds?: number;
        idleCooldownSeconds?: number;
        updatedAt?: string | null;
      };
      if (!res.ok) {
        if (res.status === 403) {
          setCanEdit(false);
          throw new Error("You do not have permission to update Slack channels.");
        }
        throw new Error(data.error || "Save failed");
      }
      const assign = (data.channelId ?? "").trim();
      const work = (data.workChannelId ?? "").trim();
      setChannelId(assign);
      setSavedChannelId(assign);
      setWorkChannelId(work);
      setSavedWorkChannelId(work);
      applyTiming(
        data.idleAfterSeconds ?? idleAfterSeconds,
        data.idleCooldownSeconds ?? idleCooldownSeconds,
      );
      setUpdatedAt(data.updatedAt ?? null);
      toast.success("Slack settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    channelId.trim() !== savedChannelId ||
    workChannelId.trim() !== savedWorkChannelId ||
    idleAfterSeconds !== savedIdleAfterSeconds ||
    idleCooldownSeconds !== savedIdleCooldownSeconds;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Slack channels
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Two channels: one for auto-assigning X/Twitter links, and one where
          staff post carousel/content (idle nudges watch that one).
        </p>
      </section>

      <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="slack-assign-channel-id">Link assign channel</Label>
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
            Bot watches this channel for X/Twitter links and @mentions the
            assignee.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slack-work-channel-id">Work / content channel</Label>
          <Input
            id="slack-work-channel-id"
            value={workChannelId}
            onChange={(e) => setWorkChannelId(e.target.value)}
            placeholder="e.g. C012GHIJKL"
            disabled={loading || saving || !canEdit}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Work/content channel only (not the link-assign channel). For each
            person who has posted here, the bot looks at their{" "}
            <span className="font-medium text-foreground">latest message</span>
            . Example: last message at 2:00 AM, it&apos;s 4:00 AM, setting is 2
            hours → they get mentioned. Runs only{" "}
            <span className="font-medium text-foreground">
              11:00 PM–7:00 AM Philippines time
            </span>
            . Everyone past the gap gets mentioned.
          </p>
        </div>

        <DurationFields
          id="idle-after"
          label="Mention if no new message for"
          hint="Time since that person's latest message in this work channel. If they haven't sent anything for this long, mention them."
          amount={idleAmount}
          unit={idleUnit}
          disabled={loading || saving || !canEdit}
          onAmountChange={setIdleAmount}
          onUnitChange={setIdleUnit}
        />

        <DurationFields
          id="idle-cooldown"
          label="Don't re-mention for"
          hint="After mentioning someone, wait at least this long before mentioning them again."
          amount={cooldownAmount}
          unit={cooldownUnit}
          disabled={loading || saving || !canEdit}
          onAmountChange={setCooldownAmount}
          onUnitChange={setCooldownUnit}
        />

        <p className="text-xs text-muted-foreground">
          In Slack: open the channel → click the channel name → About → copy
          Channel ID at the bottom. Invite the bot to both channels. Production
          idle-nudge crons run every 10 minutes only during 11:00 PM–7:00 AM
          PHT (separate from the hourly RSS cron). Mentions include how long
          it&apos;s been (e.g. &quot;2 hours and 15 minutes&quot;) plus last-seen
          PHT time. Short gaps are best tested locally via the cron endpoint.
        </p>
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Last saved {new Date(updatedAt).toLocaleString()}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading || saving || !dirty || !canEdit}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading || saving || !dirty}
            onClick={() => {
              setChannelId(savedChannelId);
              setWorkChannelId(savedWorkChannelId);
              applyTiming(savedIdleAfterSeconds, savedIdleCooldownSeconds);
            }}
          >
            Reset
          </Button>
        </div>
      </section>
    </main>
  );
}
