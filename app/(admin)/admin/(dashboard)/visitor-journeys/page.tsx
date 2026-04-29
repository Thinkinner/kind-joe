import { desc } from "drizzle-orm";
import { db } from "@/db";
import { visitorJourneyEvents } from "@/db/schema";
import {
  Circle,
  DoorOpen,
  FileText,
  Home,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type JourneyEvent = {
  path: string;
  query: string | null;
  viewedAt: Date;
};

type GroupedStep = {
  path: string;
  query: string | null;
  viewedAt: Date;
  lastViewedAt: Date;
  count: number;
};

type JourneySummary = {
  sessionId: string;
  visitorId: string | null;
  startedAt: Date;
  lastSeenAt: Date;
  steps: GroupedStep[];
  stopPage: string;
};

export const dynamic = "force-dynamic";
const EVENT_FETCH_LIMIT = 1200;
const JOURNEY_DISPLAY_LIMIT = 20;

function groupConsecutiveSteps(steps: JourneyEvent[]) {
  const next: GroupedStep[] = [];
  for (const step of steps) {
    const prev = next[next.length - 1];
    const currentPath = `${step.path}${step.query ? `?${step.query}` : ""}`;
    const prevPath = prev ? `${prev.path}${prev.query ? `?${prev.query}` : ""}` : null;
    if (currentPath === prevPath && prev) {
      prev.count += 1;
      prev.lastViewedAt = step.viewedAt;
      continue;
    }
    next.push({ ...step, lastViewedAt: step.viewedAt, count: 1 });
  }
  return next;
}

function formatDuration(from: Date, to: Date, stepCount: number) {
  const totalSeconds = Math.max(0, (to.getTime() - from.getTime()) / 1000);
  if (totalSeconds <= 0 && stepCount > 1) return "<1s";
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}m ${seconds}s`;
}

function formatStepDelta(current: Date, previous?: Date) {
  if (!previous) return "+0s";
  const seconds = Math.max(0, (current.getTime() - previous.getTime()) / 1000);
  if (seconds < 1) return "+<1s";
  if (seconds < 60) return `+${seconds.toFixed(1)}s`;
  const rounded = Math.round(seconds);
  if (rounded >= 60) {
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    return `+${m}m ${s}s`;
  }
  return `+${rounded}s`;
}

function pathIcon(path: string) {
  if (path === "/") return Home;
  if (path.startsWith("/articles") || path.startsWith("/ventura")) return FileText;
  return Circle;
}

export default async function VisitorJourneysPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;

  const rows = await db
    .select({
      sessionId: visitorJourneyEvents.sessionId,
      visitorId: visitorJourneyEvents.visitorId,
      path: visitorJourneyEvents.path,
      query: visitorJourneyEvents.query,
      viewedAt: visitorJourneyEvents.viewedAt,
    })
    .from(visitorJourneyEvents)
    .orderBy(desc(visitorJourneyEvents.viewedAt))
    .limit(EVENT_FETCH_LIMIT);

  const bySession = new Map<string, JourneySummary>();

  for (const row of rows) {
    const existing = bySession.get(row.sessionId);
    if (!existing) {
      bySession.set(row.sessionId, {
        sessionId: row.sessionId,
        visitorId: row.visitorId,
        startedAt: row.viewedAt,
        lastSeenAt: row.viewedAt,
        steps: [{ path: row.path, query: row.query, viewedAt: row.viewedAt, count: 1 }],
        stopPage: row.path,
      });
      continue;
    }

    existing.steps.push({
      path: row.path,
      query: row.query,
      viewedAt: row.viewedAt,
      count: 1,
    });
    if (row.viewedAt < existing.startedAt) existing.startedAt = row.viewedAt;
    if (row.viewedAt > existing.lastSeenAt) {
      existing.lastSeenAt = row.viewedAt;
      existing.stopPage = row.path;
    }
  }

  const journeys = Array.from(bySession.values())
    .map((journey) => {
      const ordered = [...journey.steps].sort(
        (a, b) => a.viewedAt.getTime() - b.viewedAt.getTime(),
      );
      const cleaned = groupConsecutiveSteps(ordered);
      return {
        ...journey,
        steps: cleaned,
        stopPage: cleaned[cleaned.length - 1]?.path ?? journey.stopPage,
      };
    })
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .slice(0, JOURNEY_DISPLAY_LIMIT);

  const visitorSessionCounts = new Map<string, number>();
  for (const journey of journeys) {
    if (!journey.visitorId) continue;
    visitorSessionCounts.set(
      journey.visitorId,
      (visitorSessionCounts.get(journey.visitorId) ?? 0) + 1,
    );
  }

  const exitCounts = new Map<string, number>();
  for (const journey of journeys) {
    exitCounts.set(journey.stopPage, (exitCounts.get(journey.stopPage) ?? 0) + 1);
  }
  const topExitPages = Array.from(exitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxExitCount = topExitPages[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Visitor journeys
        </h1>
        <p className="mt-1 text-sm font-normal tracking-tight text-muted-foreground">
          Footstep trail of page navigation (all public pages, admin excluded).
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing latest {JOURNEY_DISPLAY_LIMIT} journeys.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]">
        <div className="mb-3 flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium tracking-tight text-foreground">
            Top exit pages
          </h2>
        </div>
        {topExitPages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No visitor events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topExitPages.map(([path, count]) => (
              <li
                key={path}
                className="relative overflow-hidden rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-sm"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-100/70"
                  style={{ width: `${(count / maxExitCount) * 100}%` }}
                />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="truncate font-medium tracking-tight text-foreground">
                    {path}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        {journeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No visitor journey data yet.
          </div>
        ) : (
          journeys.map((journey) => (
            <article
              key={journey.sessionId}
              className="rounded-xl border border-border bg-card p-5 shadow-[0_10px_30px_-20px_rgb(15_23_42/0.2)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <UserCircle2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium tracking-tight text-foreground">
                      Duration:{" "}
                      {formatDuration(
                        journey.startedAt,
                        journey.lastSeenAt,
                        journey.steps.length,
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Started {journey.startedAt.toLocaleString()} · Last seen{" "}
                      {journey.lastSeenAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {journey.visitorId && (
                    <Badge
                      variant="secondary"
                      className="rounded-md border-0 bg-indigo-100 text-indigo-700"
                    >
                      {(visitorSessionCounts.get(journey.visitorId) ?? 0) > 1
                        ? "Returning"
                        : "New Visitor"}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="rounded-md border-border text-muted-foreground"
                  >
                    {journey.steps.length} steps
                  </Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
                <span>session: {journey.sessionId}</span>
                <span>visitor: {journey.visitorId ?? "unknown"}</span>
              </div>

              <div className="mt-4 rounded-xl bg-muted/50 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Path
                </p>
                <ol className="space-y-3 text-sm">
                  {journey.steps.map((step, idx) => {
                    const fullPath = `${step.path}${step.query ? `?${step.query}` : ""}`;
                    const isLast = idx === journey.steps.length - 1;
                    const Icon = pathIcon(step.path);
                    const prev = journey.steps[idx - 1];
                    const stepDuration = formatDuration(
                      step.viewedAt,
                      step.lastViewedAt,
                      step.count,
                    );
                    return (
                      <li key={`${journey.sessionId}_${idx}`} className="relative pl-8">
                        {idx < journey.steps.length - 1 && (
                          <span className="absolute left-[11px] top-5 h-[calc(100%+8px)] w-px bg-border" />
                        )}
                        <span
                          className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border ${
                            isLast
                              ? "border-rose-200 bg-rose-50 text-rose-600"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="break-all font-medium tracking-tight text-foreground">
                              {fullPath}
                            </span>
                            {step.count > 1 && (
                              <Badge
                                variant="secondary"
                                className="rounded-md border-0 bg-muted text-foreground"
                              >
                                x{step.count}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="rounded-md border-border text-muted-foreground"
                            >
                              stayed {stepDuration}
                            </Badge>
                            {isLast && (
                              <Badge
                                variant="secondary"
                                className="rounded-md border-0 bg-rose-100 text-rose-700"
                              >
                                <LogOut className="h-3 w-3" />
                                Exit
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {step.viewedAt.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            ·{" "}
                            {formatStepDelta(
                              step.viewedAt,
                              prev?.lastViewedAt ?? prev?.viewedAt,
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-3">
                <Button type="button" variant="ghost" size="sm">
                  View Full Session Details
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
