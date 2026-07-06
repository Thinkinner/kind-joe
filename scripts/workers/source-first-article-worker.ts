import dotenv from "dotenv";
import path from "path";
import { processOneSourceFirstArticleJob } from "@/lib/agents/source-first-article-jobs";
import { recordSourceFirstWorkerHeartbeat } from "@/lib/agents/source-first-worker-status";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });
dotenv.config();

const DEFAULT_INTERVAL_SECONDS = 5;
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

async function runOneCycle(): Promise<boolean> {
  const started = new Date();
  console.log(`[source-first-worker] cycle start at ${started.toISOString()}`);
  await recordSourceFirstWorkerHeartbeat().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[source-first-worker] heartbeat skipped: ${message}`);
  });

  let processedAny = false;
  while (!shuttingDown) {
    const result = await processOneSourceFirstArticleJob();
    if (!result.processed) break;
    processedAny = true;
    console.log(
      `[source-first-worker] processed jobId=${result.jobId ?? "unknown"}`,
    );
    await recordSourceFirstWorkerHeartbeat().catch(() => undefined);
  }

  const ended = new Date();
  console.log(
    `[source-first-worker] cycle complete at ${ended.toISOString()} ` +
      `processedAny=${processedAny}`,
  );
  return processedAny;
}

async function main() {
  const intervalSeconds = parseIntEnv(
    "SOURCE_FIRST_ARTICLE_WORKER_INTERVAL_SECONDS",
    DEFAULT_INTERVAL_SECONDS,
  );
  const runOnce = process.env.SOURCE_FIRST_ARTICLE_WORKER_RUN_ONCE === "true";
  const intervalMs = intervalSeconds * 1000;

  console.log(
    `[source-first-worker] boot interval=${intervalSeconds}s runOnce=${runOnce}`,
  );

  process.on("SIGINT", () => {
    shuttingDown = true;
    console.log("[source-first-worker] SIGINT received, shutting down...");
  });
  process.on("SIGTERM", () => {
    shuttingDown = true;
    console.log("[source-first-worker] SIGTERM received, shutting down...");
  });

  while (!shuttingDown) {
    try {
      await runOneCycle();
      if (runOnce) break;
      await sleep(intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[source-first-worker] cycle error: ${message}`);
      if (runOnce) throw error;
      await sleep(RETRY_INTERVAL_ON_ERROR_MS);
    }
  }

  console.log("[source-first-worker] stopped.");
}

main().catch((error) => {
  console.error("[source-first-worker] fatal", error);
  process.exit(1);
});
