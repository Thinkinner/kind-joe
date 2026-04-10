import { desc } from "drizzle-orm";
import { db } from "@/db";
import { visitorJourneyEvents } from "@/db/schema";

type JourneyEvent = {
  path: string;
  query: string | null;
  viewedAt: Date;
};

type JourneySummary = {
  sessionId: string;
  visitorId: string | null;
  startedAt: Date;
  lastSeenAt: Date;
  steps: JourneyEvent[];
  stopPage: string;
};

export const dynamic = "force-dynamic";

function dedupeConsecutiveSteps(steps: JourneyEvent[]) {
  const next: JourneyEvent[] = [];
  for (const step of steps) {
    const prev = next[next.length - 1];
    const currentPath = `${step.path}${step.query ? `?${step.query}` : ""}`;
    const prevPath = prev ? `${prev.path}${prev.query ? `?${prev.query}` : ""}` : null;
    if (currentPath !== prevPath) next.push(step);
  }
  return next;
}

export default async function VisitorJourneysPage() {
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
    .limit(1500);

  const bySession = new Map<string, JourneySummary>();

  for (const row of rows) {
    const existing = bySession.get(row.sessionId);
    if (!existing) {
      bySession.set(row.sessionId, {
        sessionId: row.sessionId,
        visitorId: row.visitorId,
        startedAt: row.viewedAt,
        lastSeenAt: row.viewedAt,
        steps: [{ path: row.path, query: row.query, viewedAt: row.viewedAt }],
        stopPage: row.path,
      });
      continue;
    }

    existing.steps.push({ path: row.path, query: row.query, viewedAt: row.viewedAt });
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
      const cleaned = dedupeConsecutiveSteps(ordered);
      return {
        ...journey,
        steps: cleaned,
        stopPage: cleaned[cleaned.length - 1]?.path ?? journey.stopPage,
      };
    })
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .slice(0, 60);

  const exitCounts = new Map<string, number>();
  for (const journey of journeys) {
    exitCounts.set(journey.stopPage, (exitCounts.get(journey.stopPage) ?? 0) + 1);
  }
  const topExitPages = Array.from(exitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Visitor journeys
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Footstep trail of page navigation (all public pages, admin excluded).
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Top exit pages
        </h2>
        {topExitPages.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No visitor events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topExitPages.map(([path, count]) => (
              <li
                key={path}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium text-neutral-800">{path}</span>
                <span className="tabular-nums text-neutral-600">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        {journeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
            No visitor journey data yet.
          </div>
        ) : (
          journeys.map((journey) => (
            <article
              key={journey.sessionId}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">
                  Session: {journey.sessionId}
                </span>
                <span>Visitor: {journey.visitorId ?? "unknown"}</span>
                <span>Started: {journey.startedAt.toLocaleString()}</span>
                <span>Last seen: {journey.lastSeenAt.toLocaleString()}</span>
                <span>Steps: {journey.steps.length}</span>
              </div>

              <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Path
                </p>
                <ol className="space-y-1 text-sm text-neutral-700">
                  {journey.steps.map((step, idx) => {
                    const fullPath = `${step.path}${step.query ? `?${step.query}` : ""}`;
                    const isLast = idx === journey.steps.length - 1;
                    return (
                      <li key={`${journey.sessionId}_${idx}`} className="break-all">
                        <span className="mr-2 tabular-nums text-neutral-400">
                          {idx + 1}.
                        </span>
                        <span className={isLast ? "font-semibold text-orange-700" : ""}>
                          {fullPath}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
