import Link from "next/link";
import { RefreshCw } from "lucide-react";
import {
  listKindJoeDutyRoster,
  type DutyRosterPerson,
} from "@/lib/admin/kindjoe-duty-staff";
import {
  ensureDefaultAssignSchedules,
  listWeightedAssignCandidates,
} from "@/lib/admin/kindjoe-assign-schedule";
import { getIdleMentionCountdownsForStaff } from "@/lib/admin/idle-nudge";
import { laWeekdayKey } from "@/lib/admin/duty-date";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DutyRosterPerson["status"], string> = {
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

export async function KindJoeDutyDashboardPanel() {
  await ensureDefaultAssignSchedules();
  const roster = await listKindJoeDutyRoster();
  const [countdowns, assignPool] = await Promise.all([
    getIdleMentionCountdownsForStaff(roster.people),
    listWeightedAssignCandidates(),
  ]);
  const weekday = laWeekdayKey();
  const onKindJoe = roster.people.filter((p) => p.status === "kindjoe");
  const workingOther = roster.people.filter(
    (p) => p.status === "working_other",
  );
  const notWorking = roster.people.filter((p) => p.status === "not_working");
  const missing = roster.people.filter((p) => p.status === "not_checked_in");
  const poolTotal = assignPool.reduce((sum, p) => sum + p.weight, 0);
  const poolByUser = new Map(assignPool.map((p) => [p.userId, p]));

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.22)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Admin ops · LA time
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Who&apos;s working on Kind Joe
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Duty date{" "}
            <span className="font-medium text-foreground">{roster.dutyDate}</span>{" "}
            · weekday{" "}
            <span className="font-medium uppercase text-foreground">
              {weekday}
            </span>
            . Link assign uses LA weekly weights. Idle mentions stay 9PM–7AM
            PHT.
          </p>
        </div>
        <Link
          href="/admin/kindjoe-duty"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          <RefreshCw className="size-3.5" />
          Manage schedules
        </Link>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <span className="font-semibold">Today&apos;s weighted assign pool: </span>
        {assignPool.length === 0
          ? "nobody eligible"
          : assignPool
              .map((p) => {
                const person = roster.people.find((x) => x.userId === p.userId);
                const share =
                  poolTotal > 0 ? Math.round((p.weight / poolTotal) * 100) : 0;
                return `${person?.alias || person?.name || "Staff"} ${p.weight}% (~${share}%)`;
              })
              .join(" · ")}
      </div>

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
            {" · "}
            mention after {countdowns.idleAfterMinutes}m idle
          </>
        ) : (
          <>
            <span className="font-semibold">Idle mentions paused (PHT)</span>
            {" · "}
            window opens in ~{countdowns.minutesUntilWindowOpens}m (9PM–7AM
            PHT)
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "On Kind Joe",
            value: onKindJoe.length,
            tone: "text-emerald-700",
          },
          {
            label: "Working elsewhere",
            value: workingOther.length,
            tone: "text-amber-700",
          },
          {
            label: "Not working",
            value: notWorking.length,
            tone: "text-rose-700",
          },
          {
            label: "Not checked in",
            value: missing.length,
            tone: "text-muted-foreground",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-muted/40 px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold", card.tone)}>
              {card.value}
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
              <th className="px-4 py-3 font-medium">Today weight</th>
              <th className="px-4 py-3 font-medium">Mention in</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Checked in
              </th>
              <th className="px-4 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {roster.people.map((person) => {
              const countdown = countdowns.byUserId[person.userId];
              const pool = poolByUser.get(person.userId);
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
                  <td className="px-4 py-3 tabular-nums">
                    {pool ? `${pool.weight}%` : "—"}
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
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatWhen(person.checkedInAt)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {person.openAssignments}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
