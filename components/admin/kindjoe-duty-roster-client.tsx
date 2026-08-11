"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DayWeights = Record<DayKey, number>;

type RosterPerson = {
  userId: string;
  name: string;
  alias: string | null;
  email: string | null;
  slackUserId: string | null;
  workingToday: boolean | null;
  workingKindJoe: boolean | null;
  checkedInAt: string | null;
  lastContentAt: string | null;
  lastNudgeAt: string | null;
  openAssignments: number;
  status: "kindjoe" | "working_other" | "not_working" | "not_checked_in";
};

type Schedule = {
  userId: string;
  enabled: boolean;
  weights: DayWeights;
  notes: string | null;
};

type AssignPoolItem = {
  userId: string;
  weight: number;
  openCount: number;
  source: string;
};

type MentionCountdown = {
  minutesUntilMention: number | null;
  label: string;
};

type RosterResponse = {
  dutyDate: string;
  timezone: string;
  weekday: DayKey;
  people: RosterPerson[];
  schedules: Schedule[];
  assignPool: AssignPoolItem[];
  countdowns?: {
    windowActive: boolean;
    minutesUntilWindowOpens: number;
    minutesUntilNextCron: number | null;
    idleAfterMinutes: number;
    idleCooldownMinutes: number;
    byUserId: Record<string, MentionCountdown>;
  };
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const STATUS_LABEL: Record<RosterPerson["status"], string> = {
  kindjoe: "On Kind Joe",
  working_other: "Working (not Kind Joe)",
  not_working: "Not working",
  not_checked_in: "Not checked in",
};

function emptyWeights(): DayWeights {
  return { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
}

function formatMinutesLeft(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function KindJoeDutyRosterClient() {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Schedule>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kindjoe-duty");
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as RosterResponse;
      setData(json);
      const next: Record<string, Schedule> = {};
      for (const person of json.people) {
        const existing = json.schedules.find((s) => s.userId === person.userId);
        next[person.userId] = existing
          ? { ...existing, weights: { ...existing.weights } }
          : {
              userId: person.userId,
              enabled: false,
              weights: emptyWeights(),
              notes: null,
            };
      }
      setDrafts(next);
    } catch {
      toast.error("Could not load Kind Joe duty roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const poolByUser = useMemo(() => {
    const map = new Map<string, AssignPoolItem>();
    for (const item of data?.assignPool ?? []) map.set(item.userId, item);
    return map;
  }, [data]);

  const poolTotalWeight = useMemo(
    () => (data?.assignPool ?? []).reduce((sum, p) => sum + p.weight, 0),
    [data],
  );

  const saveSchedule = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingUserId(userId);
    try {
      const res = await fetch("/api/admin/kindjoe-duty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Schedule saved");
      await load();
    } catch {
      toast.error("Could not save schedule");
    } finally {
      setSavingUserId(null);
    }
  };

  const setTodayStatus = async (
    userId: string,
    workingToday: boolean,
    workingKindJoe: boolean,
  ) => {
    setSavingUserId(userId);
    try {
      const res = await fetch("/api/admin/kindjoe-duty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_status",
          userId,
          workingToday,
          workingKindJoe,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Today's status updated");
      await load();
    } catch {
      toast.error("Could not update status");
    } finally {
      setSavingUserId(null);
    }
  };

  const applyPreset = (userId: string, kind: "full" | "poster20" | "charlyn") => {
    setDrafts((prev) => {
      const cur = prev[userId] ?? {
        userId,
        enabled: true,
        weights: emptyWeights(),
        notes: null,
      };
      let weights = emptyWeights();
      let notes = "";
      if (kind === "full") {
        weights = { mon: 100, tue: 100, wed: 100, thu: 100, fri: 100, sat: 0, sun: 0 };
        notes = "Mon–Fri full links (LA)";
      } else if (kind === "poster20") {
        weights = { mon: 20, tue: 20, wed: 20, thu: 0, fri: 0, sat: 0, sun: 0 };
        notes = "Poster Mon–Wed · ~20% of links (LA)";
      } else {
        weights = { mon: 100, tue: 100, wed: 100, thu: 25, fri: 25, sat: 0, sun: 0 };
        notes = "Mon–Wed full · Thu–Fri ~25% (poster) (LA)";
      }
      return {
        ...prev,
        [userId]: { ...cur, enabled: true, weights, notes },
      };
    });
  };

  const countdowns = data?.countdowns;
  const today = data?.weekday ?? "mon";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kind Joe assign &amp; duty
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedules use{" "}
            <span className="font-medium text-foreground">Los Angeles</span>{" "}
            weekdays. Duty date{" "}
            <span className="font-medium text-foreground">
              {data?.dutyDate ?? "…"}
            </span>{" "}
            · today{" "}
            <span className="font-medium uppercase text-foreground">
              {today}
            </span>
            . Weight 100 = full share, 20 ≈ 20% of links. Idle mentions stay
            9PM–7AM PHT.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <span className="font-semibold">Today&apos;s assign pool: </span>
        {(data?.assignPool ?? []).length === 0
          ? "nobody eligible"
          : (data?.assignPool ?? [])
              .map((p) => {
                const person = data?.people.find((x) => x.userId === p.userId);
                const share =
                  poolTotalWeight > 0
                    ? Math.round((p.weight / poolTotalWeight) * 100)
                    : 0;
                return `${person?.alias || person?.name || p.userId} ${p.weight}% (~${share}% of pool, ${p.openCount} open)`;
              })
              .join(" · ")}
      </div>

      {countdowns ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            countdowns.windowActive
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
              : "border-border bg-muted/50 text-foreground",
          )}
        >
          {countdowns.windowActive ? (
            <>
              <span className="font-semibold">Idle mentions active (PHT)</span>
              {" · "}
              {countdowns.minutesUntilNextCron == null
                ? "waiting for next cron window"
                : `next cron in ~${countdowns.minutesUntilNextCron}m`}
            </>
          ) : (
            <>
              <span className="font-semibold">Idle mentions paused (PHT)</span>
              {" · "}
              window opens in ~{countdowns.minutesUntilWindowOpens}m
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        {(data?.people ?? []).map((person) => {
          const draft = drafts[person.userId];
          const pool = poolByUser.get(person.userId);
          const countdown = countdowns?.byUserId[person.userId];
          const busy = savingUserId === person.userId;

          return (
            <div
              key={person.userId}
              className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">
                    {person.alias || person.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {person.alias ? person.name : person.email || "—"}
                    {person.slackUserId
                      ? ` · Slack ${person.slackUserId}`
                      : " · No Slack link"}
                    {pool
                      ? ` · Today weight ${pool.weight}`
                      : " · Not in today's assign pool"}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    person.status === "kindjoe" &&
                      "bg-emerald-50 text-emerald-800",
                    person.status === "working_other" &&
                      "bg-amber-50 text-amber-900",
                    person.status === "not_working" &&
                      "bg-rose-50 text-rose-800",
                    person.status === "not_checked_in" &&
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[person.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void setTodayStatus(person.userId, true, true)}
                >
                  Set On Kind Joe today
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void setTodayStatus(person.userId, true, false)
                  }
                >
                  Working, not Kind Joe
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void setTodayStatus(person.userId, false, false)
                  }
                >
                  Not working today
                </Button>
              </div>

              {draft ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [person.userId]: {
                              ...draft,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                      Schedule enabled (LA week defaults)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyPreset(person.userId, "full")}
                      >
                        Preset: full M–F
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyPreset(person.userId, "poster20")}
                      >
                        Preset: poster 20% M–W
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyPreset(person.userId, "charlyn")}
                      >
                        Preset: Charlyn
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {DAYS.map((day) => (
                      <label key={day.key} className="space-y-1 text-xs">
                        <span
                          className={cn(
                            "font-medium",
                            day.key === today && "text-emerald-700",
                          )}
                        >
                          {day.label}
                          {day.key === today ? " *" : ""}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={draft.weights[day.key]}
                          disabled={!draft.enabled}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setDrafts((prev) => ({
                              ...prev,
                              [person.userId]: {
                                ...draft,
                                weights: {
                                  ...draft.weights,
                                  [day.key]: Number.isFinite(value)
                                    ? value
                                    : 0,
                                },
                              },
                            }));
                          }}
                          className="h-8"
                        />
                      </label>
                    ))}
                  </div>

                  <Input
                    value={draft.notes ?? ""}
                    placeholder="Notes"
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [person.userId]: {
                          ...draft,
                          notes: e.target.value,
                        },
                      }))
                    }
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      Open links: {person.openAssignments}
                      {person.status === "kindjoe" && countdown
                        ? ` · Mention in ${formatMinutesLeft(countdown.minutesUntilMention)}`
                        : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void saveSchedule(person.userId)}
                    >
                      {busy ? "Saving…" : "Save schedule"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : null}
      </div>
    </div>
  );
}
