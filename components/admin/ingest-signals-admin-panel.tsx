"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Code2,
  ExternalLink,
  Plus,
  RotateCw,
  Search,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function syntaxHighlightJson(value: unknown) {
  const json = JSON.stringify(value ?? {}, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-emerald-300";
      if (/^".*":$/.test(match)) cls = "text-sky-300";
      else if (/true|false/.test(match)) cls = "text-violet-300";
      else if (/null/.test(match)) cls = "text-slate-400";
      else if (/^-?\d/.test(match)) cls = "text-orange-300";
      return `<span class="${cls}">${match}</span>`;
    },
  );
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
  const [detailTab, setDetailTab] = useState<"payload" | "meta" | "raw">("payload");
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      setLastUpdated(new Date());
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
      setLastUpdated(new Date());
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
      setLastUpdated(new Date());
    } finally {
      setLoadingMoreSignals(false);
    }
  }

  const relativeTime = (iso: string | Date) => {
    const ts = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredIncomingEvents = incomingEvents.filter((evt) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      String(evt.id).includes(q) ||
      (evt.externalEventId ?? "").toLowerCase().includes(q) ||
      evt.source.toLowerCase().includes(q) ||
      evt.text.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setDetailTab("payload");
    setCopied(false);
  }, [detailEvent?.id]);

  const activeJsonObject =
    detailTab === "payload"
      ? detailEvent?.payload ?? {}
      : detailTab === "meta"
        ? detailEvent?.meta ?? {}
        : detailEvent ?? {};

  const activeJsonString = JSON.stringify(activeJsonObject, null, 2);

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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadInitial()}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <span className="text-xs text-slate-500">
              Last updated: {lastUpdated ? relativeTime(lastUpdated) : "just now"}
            </span>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter events..."
            className="border-slate-200/70 bg-white pl-9"
          />
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        ) : filteredIncomingEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No incoming events yet.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="w-[45%]">Text</TableHead>
                    <TableHead className="w-28">Signal</TableHead>
                    <TableHead className="w-20">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncomingEvents.map((evt, idx) => (
                    <TableRow
                      key={evt.id}
                      className="text-sm even:bg-slate-50/50 hover:bg-slate-50/80"
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-slate-700">{evt.id}</p>
                          <p className="max-w-[120px] truncate font-mono text-[11px] text-slate-400">
                            {evt.externalEventId ?? "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className="rounded-md border-0 bg-slate-900 text-white">
                          {evt.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {relativeTime(evt.receivedAt)}
                      </TableCell>
                      <TableCell className="max-w-md text-sm font-medium text-slate-700">
                        <span className="line-clamp-1">{evt.text}</span>
                      </TableCell>
                      <TableCell>
                        {evt.hasMatchingSignal ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => toast.message("Signal mapping flow coming soon")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Map
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7"
                          onClick={() => setDetailEvent(evt)}
                          aria-label="View payload JSON"
                        >
                          <Code2 className="h-3.5 w-3.5" />
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
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={s.id} className="text-sm even:bg-slate-50/50 hover:bg-slate-50/80">
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
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-x-hidden overflow-y-auto p-0">
          <DialogHeader>
            <DialogTitle className="border-b border-slate-200/70 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 text-xl tracking-tight">
                <span>Event details</span>
                <Badge className="rounded-md border-0 bg-slate-900 text-white">
                  {detailEvent?.source ?? "Unknown"}
                </Badge>
                <Badge variant="outline" className="rounded-md border-slate-300 font-mono">
                  #{detailEvent?.id ?? "—"}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailEvent ? (
            <div className="space-y-4 px-6 pb-5 pt-1">
              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as "payload" | "meta" | "raw")}>
                <TabsList className="rounded-lg border border-slate-200/80 bg-slate-50 p-1">
                  <TabsTrigger value="payload" className="rounded-md">
                    Payload
                  </TabsTrigger>
                  <TabsTrigger value="meta" className="rounded-md">
                    Meta
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="rounded-md">
                    Raw
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div>
                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  {detailTab}
                </p>
                <div className="relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_16px_30px_-22px_rgba(15,23,42,0.8)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-indigo-500/10 to-transparent" />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute right-3 top-3 z-10 h-8 gap-1 rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(activeJsonString);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      } catch {
                        toast.error("Could not copy JSON");
                      }
                    }}
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <div className="max-h-[50vh] overflow-x-hidden overflow-y-auto p-6 pt-11">
                    <pre
                      className="m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-sm leading-relaxed text-slate-100"
                    >
                      <code
                        dangerouslySetInnerHTML={{
                          __html: syntaxHighlightJson(activeJsonObject),
                        }}
                      />
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="border-t border-slate-200/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setDetailEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
