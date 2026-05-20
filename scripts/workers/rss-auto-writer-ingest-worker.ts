import "dotenv/config";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";

const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_INGEST_LIMIT = 40;
const RETRY_INTERVAL_ON_ERROR_MS = 5 * 60 * 1000;

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let shuttingDown = false;

async function runOneCycle(ingestLimit: number) {
  const started = new Date();
  console.log(
    `[rss-auto-writer-ingest] cycle start at ${started.toISOString()} (ingestLimit=${ingestLimit})`,
  );
  const summary = await runRssAutoWriter({
    ingestLimit,
    ingestEnabled: true,
    writerEnabled: false,
  });
  const ended = new Date();
  console.log(
    `[rss-auto-writer-ingest] cycle complete at ${ended.toISOString()} ` +
      `scanned=${summary.ingestedScanned} queued=${summary.queued} staleArchived=${summary.staleArchived} ` +
      `skipped=${summary.skipped} failed=${summary.failed}`,
  );
}

async function main() {
  const intervalMinutes = parseIntEnv(
    "RSS_AUTO_WRITER_INGEST_INTERVAL_MINUTES",
    DEFAULT_INTERVAL_MINUTES,
  );
  const ingestLimit = parseIntEnv(
    "RSS_AUTO_WRITER_INGEST_LIMIT",
    DEFAULT_INGEST_LIMIT,
  );
  const runOnce = process.env.RSS_AUTO_WRITER_RUN_ONCE === "true";
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[rss-auto-writer-ingest] boot interval=${intervalMinutes}m runOnce=${runOnce} ingestLimit=${ingestLimit}`,
  );

  process.on("SIGINT", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-ingest] SIGINT received, shutting down...");
  });
  process.on("SIGTERM", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-ingest] SIGTERM received, shutting down...");
  });

  while (!shuttingDown) {
    try {
      await runOneCycle(ingestLimit);
      if (runOnce) break;
      await sleep(intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[rss-auto-writer-ingest] cycle error: ${message}`);
      if (runOnce) throw error;
      await sleep(RETRY_INTERVAL_ON_ERROR_MS);
    }
  }

  console.log("[rss-auto-writer-ingest] stopped.");
}

main().catch((error) => {
  console.error("[rss-auto-writer-ingest] fatal", error);
  process.exit(1);
});
