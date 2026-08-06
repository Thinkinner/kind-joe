import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Slack request signature (v0).
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequestSignature(input: {
  signingSecret: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  maxAgeSeconds?: number;
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = input;
  const maxAgeSeconds = input.maxAgeSeconds ?? 60 * 5;

  if (!signature || !timestamp) return false;
  if (!signature.startsWith("v0=")) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > maxAgeSeconds) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${digest}`;

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
