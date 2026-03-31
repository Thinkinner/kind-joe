import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logAuthEvent } from "@/lib/auth/log";

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let broadLimiter: Ratelimit | null = null;
let strictLimiter: Ratelimit | null = null;

function getBroadLimiter(): Ratelimit | null {
  if (!redisConfigured()) return null;
  if (!broadLimiter) {
    broadLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(120, "1 m"),
      prefix: "auth:broad",
    });
  }
  return broadLimiter;
}

function getStrictLimiter(): Ratelimit | null {
  if (!redisConfigured()) return null;
  if (!strictLimiter) {
    strictLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "15 m"),
      prefix: "auth:strict",
    });
  }
  return strictLimiter;
}

/** Relative path under /api/auth (no leading slash). */
export function isStrictAuthPath(authPath: string): boolean {
  const p = authPath.toLowerCase();
  return (
    p.includes("sign-in/email") ||
    p.includes("sign-up/email") ||
    p.includes("request-password-reset") ||
    p.includes("send-verification-email")
  );
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type RateLimitResult = { success: true } | { success: false; retryAfter?: number };

/**
 * Apply rate limits before Better Auth handles the request.
 * No-op when Upstash env is unset (dev / CI).
 */
export async function limitAuthPost(
  request: Request,
  authPath: string,
): Promise<RateLimitResult> {
  if (!redisConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logAuthEvent("warn", "rate_limit_disabled", {
        reason: "missing_upstash_env",
      });
    }
    return { success: true };
  }

  const ip = getClientIp(request);
  const broad = getBroadLimiter();
  const strict = getStrictLimiter();
  if (!broad || !strict) return { success: true };

  const { success: broadOk, reset: broadReset } = await broad.limit(
    `ip:${ip}`,
  );
  if (!broadOk) {
    logAuthEvent("warn", "rate_limit_broad", { ip: hashIp(ip) });
    return {
      success: false,
      retryAfter: Math.max(0, Math.ceil((broadReset - Date.now()) / 1000)),
    };
  }

  if (isStrictAuthPath(authPath)) {
    const { success: strictOk, reset: strictReset } = await strict.limit(
      `ip:${ip}:${authPath.split("/")[0] ?? "auth"}`,
    );
    if (!strictOk) {
      logAuthEvent("warn", "rate_limit_strict", {
        path: authPath,
        ip: hashIp(ip),
      });
      return {
        success: false,
        retryAfter: Math.max(0, Math.ceil((strictReset - Date.now()) / 1000)),
      };
    }
  }

  return { success: true };
}

function hashIp(ip: string): string {
  if (ip === "unknown") return ip;
  return ip.length <= 8 ? "***" : `${ip.slice(0, 4)}…${ip.slice(-4)}`;
}
