"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileJson2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  IncomingEventAdminRow,
  SignalAdminRow,
} from "@/lib/webhooks/admin-ingest-view";

const DEFAULT_LIMIT = 50;

type IngestDataResponse = {
  incomingEvents?: IncomingEventAdminRow[];
  signals?: SignalAdminRow[];
  nextCursors?: {
    incoming?: string | null;
    signals?: string | null;
  };
  error?: string;
};

function buildIngestDataUrl(opts: {
  includeIncoming: boolean;
  includeSignals: boolean;
  incomingLimit: number;
  signalsLimit: number;
  incomingCursor?: string | null;
  signalsCursor?: string | null;
}) {
  const u = new URL("/api/admin/ingest-data", window.location.origin);
  if (!opts.includeIncoming) u.searchParams.set("includeIncoming", "0");
  if (!opts.includeSignals) u.searchParams.set("includeSignals", "0");
  u.searchParams.set("incomingLimit", String(opts.incomingLimit));
  u.searchParams.set("signalsLimit", String(opts.signalsLimit));
  if (opts.incomingCursor) {
    u.searchParams.set("incomingCursor", opts.incomingCursor);
  }
  if (opts.signalsCursor) {
    u.searchParams.set("signalsCursor", opts.signalsCursor);
  }
  return u.toString();
}

function clip(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function IngestSignalsAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [incomingEvents, setIncomingEvents] = useState<IncomingEventAdminRow[]>(
    [],
  );
  const [signals, setSignals] = useState<SignalAdminRow[]>([]);
  const [incomingCursor, setIncomingCursor] = useState<string | null>(null);
  const [signalsCursor, setSignalsCursor] = useState<string | null>(null);
  const [loadingMoreIncoming, setLoadingMoreIncoming] = useState(false);
  const [loadingMoreSignals, setLoadingMoreSignals] = useState(false);
  const [detailEvent, setDetailEvent] = useState<IncomingEventAdminRow | null>(
    null,
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        buildIngestDataUrl({
          includeIncoming: true,
          includeSignals: true,
          incomingLimit: DEFAULT_LIMIT,
          signalsLimit: DEFAULT_LIMIT,
        }),
        { method: "GET", credentials: "include" },
      );
      const body = (await res.json().catch(() => ({}))) as IngestDataResponse;
      if (!res.ok) {
        toast.error(body.error ?? "Could not load ingest data.");
        return;
      }
      setIncomingEvents(Array.isArray(body.incomingEvents) ? body.incomingEvents : []);
      setSignals(Array.isArray(body.signals) ? body.signals : []);
      setIncomingCursor(body.nextCursors?.incoming ?? null);
      setSignalsCursor(body.nextCursors?.signals ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function loadMoreIncoming() {
    if (!incomingCursor) return;
    setLoadingMoreIncoming(true);
    try {
      const res = await fetch(
        buildIngestDataUrl({
          includeIncoming: true,
          includeSignals: false,
          incomingLimit: DEFAULT_LIMIT,
          signalsLimit: DEFAULT_LIMIT,
          incomingCursor,
        }),
        { method: "GET", credentials: "include" },
      );
      const body = (await res.json().catch(() => ({}))) as IngestDataResponse;
      if (!res.ok) {
        toast.error(body.error ?? "Could not load more events.");
        return;
      }
      const next = Array.isArray(body.incomingEvents) ? body.incomingEvents : [];
      setIncomingEvents((prev) => [...prev, ...next]);
      setIncomingCursor(body.nextCursors?.incoming ?? null);
    } finally {
      setLoadingMoreIncoming(false);
    }
  }

  async function loadMoreSignals() {
    if (!signalsCursor) return;
    setLoadingMoreSignals(true);
    try {
      const res = await fetch(
        buildIngestDataUrl({
          includeIncoming: false,
          includeSignals: true,
          incomingLimit: DEFAULT_LIMIT,
          signalsLimit: DEFAULT_LIMIT,
          signalsCursor,
        }),
        { method: "GET", credentials: "include" },
      );
      const body = (await res.json().catch(() => ({}))) as IngestDataResponse;
      if (!res.ok) {
        toast.error(body.error ?? "Could not load more signals.");
        return;
      }
      const next = Array.isArray(body.signals) ? body.signals : [];
      setSignals((prev) => [...prev, ...next]);
      setSignalsCursor(body.nextCursors?.signals ?? null);
    } finally {
      setLoadingMoreSignals(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Incoming webhook events
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Raw rows from <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">incoming_events</code> including stored{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">payload</code> and{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">meta</code>.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void loadInitial()}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        ) : incomingEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No incoming events yet.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">ID</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead className="w-28">Signal</TableHead>
                    <TableHead className="w-32">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingEvents.map((evt) => (
                    <TableRow key={evt.id}>
                      <TableCell className="font-mono text-xs">{evt.id}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">
                        {evt.externalEventId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{evt.source}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {new Date(evt.receivedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-md text-xs text-slate-800">
                        {clip(evt.text, 160)}
                      </TableCell>
                      <TableCell>
                        {evt.hasMatchingSignal ? (
                          <Badge className="text-[10px]">In signals</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-xs"
                          onClick={() => setDetailEvent(evt)}
                        >
                          <FileJson2 className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {incomingCursor ? (
              <Button
                type="button"
                variant="outline"
                disabled={loadingMoreIncoming}
                onClick={() => void loadMoreIncoming()}
              >
                {loadingMoreIncoming ? "Loading…" : "Load more events"}
              </Button>
            ) : (
              <p className="text-xs text-slate-500">End of incoming events.</p>
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Signals</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Persisted rows in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">signals</code> after ingest.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <Link href="/kindjoe-watch" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Kind Joe Watch
            </Link>
          </Button>
        </div>

        {loading ? null : signals.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No signals in the database.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="max-w-[100px]">ID</TableHead>
                    <TableHead>Headline</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-16">Impact</TableHead>
                    <TableHead>Enrichment</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-[100px] truncate font-mono text-[11px]">
                        {clip(s.id, 24)}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs">
                        {clip(s.headline, 120)}
                      </TableCell>
                      <TableCell className="text-xs">{s.source}</TableCell>
                      <TableCell className="text-xs">{s.category ?? "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {s.impactScore ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs text-slate-600">
                        {[s.enrichmentProvider, s.enrichmentModel]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {s.timestamp
                          ? new Date(s.timestamp).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {signalsCursor ? (
              <Button
                type="button"
                variant="outline"
                disabled={loadingMoreSignals}
                onClick={() => void loadMoreSignals()}
              >
                {loadingMoreSignals ? "Loading…" : "Load more signals"}
              </Button>
            ) : (
              <p className="text-xs text-slate-500">End of signals.</p>
            )}
          </>
        )}
      </section>

      <Dialog open={detailEvent != null} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Incoming event #{detailEvent?.id}{" "}
              <span className="font-normal text-slate-500">
                · {detailEvent?.source}
              </span>
            </DialogTitle>
          </DialogHeader>
          {detailEvent ? (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payload
                </p>
                <pre className="max-h-[40vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-800">
                  {JSON.stringify(detailEvent.payload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta
                </p>
                <pre className="max-h-[30vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-800">
                  {JSON.stringify(detailEvent.meta ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
