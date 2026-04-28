import { Client } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import {
  getAutoCommentScheduleMinutes,
  type QueuedAutoCommentPayload,
} from "@/lib/automation/article-auto-comments";

const QUEUE_KEY_PREFIX = "auto-comments:qstash:scheduled";
const DEFAULT_QUEUE_TTL_SECONDS = 14 * 24 * 60 * 60;
const QUEUE_ROUTE_PATH = "/api/internal/auto-comments/run";

type EnqueueResult = {
  enqueued: number;
  skipped: number;
  reason?: string;
};

let redisClient: Redis | null = null;
let qstashClient: Client | null = null;

function getRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    return null;
  }
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

function getQstashClient(): Client | null {
  // Canonical QStash env var names are QSTASH_*.
  const token =
    process.env.QSTASH_TOKEN?.trim() ||
    process.env.UPSTASH_QSTASH_TOKEN?.trim() ||
    "";
  if (!token) return null;
  if (!qstashClient) qstashClient = new Client({ token });
  return qstashClient;
}

function resolveBaseUrl(): string | null {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/+$/, "")}`;
  return null;
}

function queueKey(articleId: string, slotIndex: number, publishedAtIso: string): string {
  return `${QUEUE_KEY_PREFIX}:${articleId}:${slotIndex}:${publishedAtIso}`;
}

export async function enqueueArticleAutoCommentJobs(params: {
  articleId: string;
  marketId: number | null;
  isDraft: boolean;
  publishedAt: Date | null;
}): Promise<EnqueueResult> {
  if (params.isDraft) return { enqueued: 0, skipped: 0, reason: "article_is_draft" };
  if (!params.publishedAt) return { enqueued: 0, skipped: 0, reason: "missing_publish_time" };
  if (params.marketId == null) return { enqueued: 0, skipped: 0, reason: "missing_market_id" };

  const redis = getRedis();
  const qstash = getQstashClient();
  const baseUrl = resolveBaseUrl();
  if (!redis || !qstash || !baseUrl) {
    return { enqueued: 0, skipped: 0, reason: "queue_not_configured" };
  }

  const nowMs = Date.now();
  const publishedAtIso = params.publishedAt.toISOString();
  const schedule = getAutoCommentScheduleMinutes(params.articleId);
  let enqueued = 0;
  let skipped = 0;

  for (let slotIndex = 0; slotIndex < schedule.length; slotIndex += 1) {
    const delayMinutes = schedule[slotIndex] ?? 0;
    const dueAtMs = params.publishedAt.getTime() + delayMinutes * 60_000;
    const dueAtIso = new Date(dueAtMs).toISOString();
    const lock = await redis.set(
      queueKey(params.articleId, slotIndex, publishedAtIso),
      dueAtIso,
      { nx: true, ex: DEFAULT_QUEUE_TTL_SECONDS },
    );
    if (lock !== "OK") {
      skipped += 1;
      continue;
    }

    const delaySeconds = BigInt(Math.max(0, Math.ceil((dueAtMs - nowMs) / 1000)));
    const payload: QueuedAutoCommentPayload = {
      articleId: params.articleId,
      marketId: params.marketId,
      slotIndex,
      delayMinutes,
      publishedAtIso,
      dueAtIso,
    };

    await qstash.publishJSON({
      url: `${baseUrl}${QUEUE_ROUTE_PATH}`,
      body: payload,
      delay: `${delaySeconds}s`,
      retries: 3,
    });
    enqueued += 1;
  }

  return { enqueued, skipped };
}
