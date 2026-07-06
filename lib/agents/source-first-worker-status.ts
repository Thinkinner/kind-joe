import { Redis } from "@upstash/redis";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sourceFirstArticleJobs } from "@/db/schema";

const HEARTBEAT_KEY = "worker:source-first:heartbeat";
const HEARTBEAT_TTL_SECONDS = 120;
const HEARTBEAT_ONLINE_MS = 90_000;
const QUEUED_STALE_MS = 45_000;

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!redisConfigured()) return null;
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

export async function recordSourceFirstWorkerHeartbeat(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(HEARTBEAT_KEY, Date.now(), { ex: HEARTBEAT_TTL_SECONDS });
}

export type SourceFirstWorkerStatus = {
  workerOnline: boolean;
  lastHeartbeatAt: string | null;
  queuedCount: number;
  processingCount: number;
  oldestQueuedAgeMs: number | null;
  hint: string;
};

export async function getSourceFirstWorkerStatus(): Promise<SourceFirstWorkerStatus> {
  const redis = getRedis();
  let lastHeartbeatMs: number | null = null;

  if (redis) {
    const raw = await redis.get<number | string>(HEARTBEAT_KEY);
    if (raw != null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) lastHeartbeatMs = parsed;
    }
  }

  const [counts, oldestQueued] = await Promise.all([
    db
      .select({
        queuedCount: sql<number>`coalesce(sum(case when ${sourceFirstArticleJobs.status} = 'queued' then 1 else 0 end), 0)::int`,
        processingCount: sql<number>`coalesce(sum(case when ${sourceFirstArticleJobs.status} = 'processing' then 1 else 0 end), 0)::int`,
      })
      .from(sourceFirstArticleJobs),
    db
      .select({ createdAt: sourceFirstArticleJobs.createdAt })
      .from(sourceFirstArticleJobs)
      .where(eq(sourceFirstArticleJobs.status, "queued"))
      .orderBy(asc(sourceFirstArticleJobs.createdAt))
      .limit(1),
  ]);

  const queuedCount = counts[0]?.queuedCount ?? 0;
  const processingCount = counts[0]?.processingCount ?? 0;
  const oldestQueuedAt = oldestQueued[0]?.createdAt ?? null;
  const oldestQueuedAgeMs = oldestQueuedAt
    ? Math.max(0, Date.now() - oldestQueuedAt.getTime())
    : null;

  const heartbeatFresh =
    lastHeartbeatMs != null &&
    Date.now() - lastHeartbeatMs < HEARTBEAT_ONLINE_MS;

  const workerOnline = heartbeatFresh || processingCount > 0;

  let hint = "Railway worker is polling the job queue.";
  if (!workerOnline && queuedCount > 0 && (oldestQueuedAgeMs ?? 0) >= QUEUED_STALE_MS) {
    hint =
      "No worker heartbeat detected. Deploy the Railway content-research worker service and set the same DATABASE_URL + Google keys.";
  } else if (processingCount > 0) {
    hint = "Worker is processing a job now.";
  } else if (queuedCount > 0) {
    hint = "Job queued — worker should pick it up within a few seconds.";
  }

  return {
    workerOnline,
    lastHeartbeatAt:
      lastHeartbeatMs != null ? new Date(lastHeartbeatMs).toISOString() : null,
    queuedCount,
    processingCount,
    oldestQueuedAgeMs,
    hint,
  };
}
