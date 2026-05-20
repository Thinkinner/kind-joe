import "dotenv/config";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";

const DEFAULT_INTERVAL_SECONDS = 45;
const DEFAULT_WRITER_MAX_PER_RUN = 5;
const RETRY_INTERVAL_ON_ERROR_MS = 30 * 1000;

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let shuttingDown = false;

async function runOneCycle(writerMaxPerRun: number) {
  const started = new Date();
  console.log(
    `[rss-auto-writer-queue] cycle start at ${started.toISOString()} (writerMaxPerRun=${writerMaxPerRun})`,
  );
  const summary = await runRssAutoWriter({
    writerMaxPerRun,
    ingestEnabled: false,
    writerEnabled: true,
  });
  const ended = new Date();
  console.log(
    `[rss-auto-writer-queue] cycle complete at ${ended.toISOString()} ` +
      `writerProcessed=${summary.writerProcessed} skipped=${summary.skipped} failed=${summary.failed} ` +
      `queue={queued:${summary.queueStats.queued},processing:${summary.queueStats.processing},failed:${summary.queueStats.failed}}`,
  );
}

async function main() {
  const intervalSeconds = parseIntEnv(
    "RSS_AUTO_WRITER_QUEUE_INTERVAL_SECONDS",
    DEFAULT_INTERVAL_SECONDS,
  );
  const writerMaxPerRun = parseIntEnv(
    "RSS_AUTO_WRITER_WRITER_MAX_PER_RUN",
    DEFAULT_WRITER_MAX_PER_RUN,
  );
  const runOnce = process.env.RSS_AUTO_WRITER_RUN_ONCE === "true";
  const intervalMs = intervalSeconds * 1000;

  console.log(
    `[rss-auto-writer-queue] boot interval=${intervalSeconds}s runOnce=${runOnce} writerMaxPerRun=${writerMaxPerRun}`,
  );

  process.on("SIGINT", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-queue] SIGINT received, shutting down...");
  });
  process.on("SIGTERM", () => {
    shuttingDown = true;
    console.log("[rss-auto-writer-queue] SIGTERM received, shutting down...");
  });

  while (!shuttingDown) {
    try {
      await runOneCycle(writerMaxPerRun);
      if (runOnce) break;
      await sleep(intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[rss-auto-writer-queue] cycle error: ${message}`);
      if (runOnce) throw error;
      await sleep(RETRY_INTERVAL_ON_ERROR_MS);
    }
  }

  console.log("[rss-auto-writer-queue] stopped.");
}

main().catch((error) => {
  console.error("[rss-auto-writer-queue] fatal", error);
  process.exit(1);
});
