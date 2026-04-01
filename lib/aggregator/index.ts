import { db } from "@/db";
import { signals } from "@/db/schema";
import { SIGNALS_HISTORY_LIMIT } from "@/lib/signals/signals-history-limit";
import { desc, gt, lt } from "drizzle-orm";
import { processIntelRaw } from "./factory";
import Parser from "rss-parser";
import type { Source } from "./types";

const parser = new Parser({
  customFields: {
    item: [["georss:point", "georssPoint"]],
  },
});

/**
 * Max USGS Atom entries processed per cron run.
 * Raise/lower with serverless `maxDuration` (manual sync / optional cron route) in mind.
 */
const MAX_ITEMS_TO_PROCESS = 12;

/**
 * Minimum newest items to reserve from each feed before global merge.
 * Cron only polls USGS here; Google News + Apple Newsroom use `kindjoe-signal-worker`
 * → POST /api/webhooks/rss-intel.
 */
const MIN_CANDIDATES_PER_FEED = 2;

type FeedSpec = {
  url: string;
  source: Source;
  maxCandidates: number;
};

/** If the worker uses `INCLUDE_USGS=1`, remove this entry (or disable cron) to avoid duplicate USGS. */
const FEED_SPECS: FeedSpec[] = [
  {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom",
    source: "USGS Earthquakes",
    maxCandidates: 12,
  },
];

function cacheBustUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

type RssItem = Parser.Item & {
  updated?: string;
  date?: string;
  /** USGS Atom `<georss:point>lat lng</georss:point>` via rss-parser customFields */
  georssPoint?: string;
};

function parseUsgsGeorssPoint(
  item: RssItem,
): { lat: number; lng: number } | null {
  const p = item.georssPoint?.trim();
  if (!p) return null;
  const parts = p.split(/\s+/);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function itemTimestamp(item: RssItem): Date {
  const raw =
    item.pubDate ?? item.isoDate ?? item.updated ?? item.date;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function itemBody(item: RssItem): string {
  const snippet = item.contentSnippet ?? "";
  const c = item.content;
  const content =
    typeof c === "string"
      ? c
      : c && typeof c === "object" && "_" in c
        ? String((c as { _: string })._)
        : "";
  return `${item.title ?? ""} ${snippet || content}`.trim();
}

type Candidate = { item: RssItem; source: Source; ts: Date };

function candidateKey(c: Candidate): string | null {
  const id = c.item.guid ?? c.item.link;
  if (!id || String(id).trim() === "") return null;
  return String(id).trim();
}

/** Dedupe by guid/link, guarantee up to MIN per feed, then fill by global recency. */
function selectCandidatesForProcessing(batches: Candidate[][]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (const batch of batches) {
    let taken = 0;
    for (const c of batch) {
      if (taken >= MIN_CANDIDATES_PER_FEED) break;
      const key = candidateKey(c);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(c);
      taken++;
    }
  }

  const rest = batches
    .flat()
    .filter((c) => {
      const key = candidateKey(c);
      return key !== null && !seen.has(key);
    })
    .sort((a, b) => b.ts.getTime() - a.ts.getTime());

  for (const c of rest) {
    if (out.length >= MAX_ITEMS_TO_PROCESS) break;
    const key = candidateKey(c)!;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }

  out.sort((a, b) => b.ts.getTime() - a.ts.getTime());
  return out.slice(0, MAX_ITEMS_TO_PROCESS);
}

async function fetchFeedCandidates(spec: FeedSpec): Promise<Candidate[]> {
  const feed = await parser
    .parseURL(cacheBustUrl(spec.url))
    .catch((): { items: RssItem[] } => ({ items: [] }));

  const sorted = [...feed.items].sort(
    (a, b) => itemTimestamp(b).getTime() - itemTimestamp(a).getTime(),
  );

  return sorted.slice(0, spec.maxCandidates).map((item) => ({
    item: item as RssItem,
    source: spec.source,
    ts: itemTimestamp(item as RssItem),
  }));
}

/**
 * 1. SYNC REAL TIME NEWS (USGS only here; Google/Apple via RSS worker webhook.)
 */
export async function syncRealTimeNews() {
  try {
    const batches = await Promise.all(FEED_SPECS.map(fetchFeedCandidates));
    const top = selectCandidatesForProcessing(batches);

    const processPromises = top.map(({ item, source, ts }) => {
      const id = item.guid ?? item.link;
      if (!id) return Promise.resolve(null);

      const timestamp = ts.getTime() > 0 ? ts : new Date();
      const coords =
        source === "USGS Earthquakes" ? parseUsgsGeorssPoint(item) : null;

      return processIntelRaw({
        id: String(id),
        text: itemBody(item),
        source,
        timestamp,
        sourceUrl: item.link?.trim() || null,
        headline: item.title?.trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
    });

    return await Promise.all(processPromises);
  } catch (error) {
    console.error("RSS Swarm Error:", error);
    return [];
  }
}

/**
 * 2. GET SIGNALS FROM DB (The missing export!)
 */
export async function getSignalsFromDB() {
  // Wider window + higher limit so the feed and globe can show a dense signal stream
  const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await db
    .select()
    .from(signals)
    .where(gt(signals.timestamp, TWENTY_FOUR_HOURS_AGO))
    .orderBy(desc(signals.timestamp))
    .limit(SIGNALS_HISTORY_LIMIT);
}

export async function purgeOldSignals() {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await db.delete(signals).where(lt(signals.timestamp, fortyEightHoursAgo));
  console.log("🧹 System Maintenance: Old signals purged.");
}
