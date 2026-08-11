"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RosterPerson = {
  userId: string;
  name: string;
  alias: string | null;
  email: string | null;
  slackUserId: string | null;
  dutyDate: string | null;
  workingToday: boolean | null;
  workingKindJoe: boolean | null;
  checkedInAt: string | null;
  lastContentAt: string | null;
  lastNudgeAt: string | null;
  openAssignments: number;
  status: "kindjoe" | "working_other" | "not_working" | "not_checked_in";
};

type MentionCountdown = {
  minutesUntilMention: number | null;
  label: string;
  reason: string;
};

type RosterResponse = {
  dutyDate: string;
  timezone: string;
  people: RosterPerson[];
  countdowns?: {
    windowActive: boolean;
    minutesUntilWindowOpens: number;
    minutesUntilNextCron: number | null;
    idleAfterMinutes: number;
    idleCooldownMinutes: number;
    byUserId: Record<string, MentionCountdown>;
  };
};

const STATUS_LABEL: Record<RosterPerson["status"], string> = {
  kindjoe: "On Kind Joe",
  working_other: "Working (not Kind Joe)",
  not_working: "Not working",
  not_checked_in: "Not checked in",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kindjoe-duty");
      if (!res.ok) throw new Error("Failed");
      setData((await res.json()) as RosterResponse);
    } catch {
      toast.error("Could not load Kind Joe duty roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const people = data?.people ?? [];
    return {
      kindjoe: people.filter((p) => p.status === "kindjoe").length,
      workingOther: people.filter((p) => p.status === "working_other").length,
      notWorking: people.filter((p) => p.status === "not_working").length,
      missing: people.filter((p) => p.status === "not_checked_in").length,
    };
  }, [data]);

  const countdowns = data?.countdowns;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Who&apos;s working on Kind Joe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Duty date{" "}
            <span className="font-medium text-foreground">
              {data?.dutyDate ?? "…"}
            </span>{" "}
            ({data?.timezone ?? "America/Los_Angeles"}). Link assign and idle
            nudge only use people marked On Kind Joe.
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
              <span className="font-semibold">Idle mentions active</span>
              {" · "}
              {countdowns.minutesUntilNextCron == null
                ? "waiting for next cron window"
                : `next cron in ~${countdowns.minutesUntilNextCron}m`}
              {" · "}
              mention after {countdowns.idleAfterMinutes}m idle (cooldown{" "}
              {countdowns.idleCooldownMinutes}m)
            </>
          ) : (
            <>
              <span className="font-semibold">Idle mentions paused</span>
              {" · "}
              window opens in ~{countdowns.minutesUntilWindowOpens}m (9PM–7AM
              PHT)
            </>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "On Kind Joe", value: counts.kindjoe, tone: "text-emerald-700" },
          {
            label: "Working elsewhere",
            value: counts.workingOther,
            tone: "text-amber-700",
          },
          { label: "Not working", value: counts.notWorking, tone: "text-rose-700" },
          {
            label: "Not checked in",
            value: counts.missing,
            tone: "text-muted-foreground",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold", card.tone)}>
              {loading && !data ? "…" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Mention in</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Checked in
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Last content
              </th>
              <th className="px-4 py-3 font-medium">Open links</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : null}
            {(data?.people ?? []).map((person) => {
              const countdown = countdowns?.byUserId[person.userId];
              return (
                <tr
                  key={person.userId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {person.alias || person.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {person.alias ? person.name : person.email || "—"}
                      {person.slackUserId
                        ? ` · Slack ${person.slackUserId}`
                        : " · No Slack link"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3">
                    {person.status === "kindjoe" && countdown ? (
                      <div>
                        <div className="font-semibold tabular-nums text-foreground">
                          {formatMinutesLeft(countdown.minutesUntilMention)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {countdown.label}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatWhen(person.checkedInAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatWhen(person.lastContentAt)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {person.openAssignments}
                  </td>
                </tr>
              );
            })}
            {!loading && data && data.people.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No staff accounts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
