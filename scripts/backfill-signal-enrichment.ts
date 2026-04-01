/**
 * Backfill enrichment metadata on existing signals rows.
 * Usage: npx tsx scripts/backfill-signal-enrichment.ts [limit]
 */
import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { signals } from "../db/schema";
import type { Source } from "../lib/aggregator/types";
import {
  canonicalizeSignalUrl,
  deriveSignalIdentity,
  deriveTrustMetadata,
  extractMediaUrls,
  markdownToPlainText,
  normalizeSignalBodyText,
} from "../lib/signals/signal-enrichment";

const SOURCE_SET = new Set<Source>([
  "X",
  "Telegram",
  "Discord",
  "RSS",
  "Google News",
  "Apple Newsroom",
  "USGS Earthquakes",
]);

async function main() {
  const limit = Math.max(1, Number.parseInt(process.argv[2] ?? "500", 10) || 500);
  console.log(`[backfill] loading latest ${limit} rows…`);

  const rows = await db
    .select()
    .from(signals)
    .orderBy(desc(signals.timestamp))
    .limit(limit);

  let updated = 0;
  for (const row of rows) {
    const source = SOURCE_SET.has(row.source as Source)
      ? (row.source as Source)
      : "RSS";

    const canonical = canonicalizeSignalUrl(row.sourceUrl ?? null);
    const identity = deriveSignalIdentity(source, canonical);
    const trust = deriveTrustMetadata(source);
    const normalizedSummary = normalizeSignalBodyText(row.summary ?? "");
    const normalizedHeadline = markdownToPlainText(row.headline ?? "").slice(0, 512);
    const mediaUrls = extractMediaUrls(normalizedSummary, canonical);

    const next = {
      sourceUrl: canonical ?? row.sourceUrl,
      canonicalSourceUrl: canonical,
      sourceDisplayName: identity.sourceDisplayName,
      sourceHandle: identity.sourceHandle,
      sourceIconKey: identity.sourceIconKey,
      trustTier: trust.trustTier,
      trustScore: trust.trustScore,
      mediaUrls,
      summary: normalizedSummary,
      headline: normalizedHeadline || row.headline,
    };

    await db.update(signals).set(next).where(eq(signals.id, row.id));
    updated++;
  }

  console.log(`[backfill] done. updated ${updated} signals.`);
}

main().catch((e) => {
  console.error("[backfill] failed:", e);
  process.exit(1);
});

