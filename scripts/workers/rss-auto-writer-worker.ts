import "dotenv/config";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";

const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_INGEST_LIMIT = 40;
const DEFAULT_WRITER_MAX_PER_RUN = 1;
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

async function runOneCycle(ingestLimit: number, writerMaxPerRun: number) {
  const started = new Date();
  console.log(
    `[rss-auto-writer-worker] cycle start at ${started.toISOString()} (ingestLimit=${ingestLimit} writerMaxPerRun=${writerMaxPerRun})`,
  );
  const summary = await runRssAutoWriter({ ingestLimit, writerMaxPerRun });
  const ended = new Date();
  console.log(
    `[rss-auto-writer-worker] cycle complete at ${ended.toISOString()} ` +
      `ingested=${summary.ingestedScanned} queued=${summary.queued} ` +
      `writerProcessed=${summary.writerProcessed} skipped=${summary.skipped} failed=${summary.failed}`,
  );
}

async function main() {
  const intervalMinutes = parseIntEnv(
    "RSS_AUTO_WRITER_INTERVAL_MINUTES",
    DEFAULT_INTERVAL_MINUTES,
  );
  const ingestLimit = parseIntEnv(
    "RSS_AUTO_WRITER_INGEST_LIMIT",
    DEFAULT_INGEST_LIMIT,
  );
  const writerMaxPerRun = parseIntEnv(
    "RSS_AUTO_WRITER_WRITER_MAX_PER_RUN",
    DEFAULT_WRITER_MAX_PER_RUN,
  );
  const runOnce = process.env.RSS_AUTO_WRITER_RUN_ONCE === "true";
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[rss-auto-writer-worker] boot interval=${intervalMinutes}m runOnce=${runOnce} ingestLimit=${ingestLimit} writerMaxPerRun=${writerMaxPerRun}`,
  );

  process.on("SIGINT", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-worker] SIGINT received, shutting down...");
  });
  process.on("SIGTERM", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-worker] SIGTERM received, shutting down...");
  });

  while (!shuttingDown) {
    try {
      await runOneCycle(ingestLimit, writerMaxPerRun);
      if (runOnce) break;
      await sleep(intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[rss-auto-writer-worker] cycle error: ${message}`);
      if (runOnce) throw error;
      await sleep(RETRY_INTERVAL_ON_ERROR_MS);
    }
  }

  console.log("[rss-auto-writer-worker] stopped.");
}

main().catch((error) => {
  console.error("[rss-auto-writer-worker] fatal", error);
  process.exit(1);
});
