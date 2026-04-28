import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import {
  processQueuedArticleAutoComment,
  type QueuedAutoCommentPayload,
} from "@/lib/automation/article-auto-comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getQstashReceiver(): Receiver | null {
  // Canonical QStash env var names are QSTASH_*.
  const currentSigningKey =
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() ||
    process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY?.trim() ||
    "";
  const nextSigningKey =
    process.env.QSTASH_NEXT_SIGNING_KEY?.trim() ||
    process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY?.trim() ||
    "";
  if (!currentSigningKey || !nextSigningKey) return null;
  return new Receiver({ currentSigningKey, nextSigningKey });
}

async function verifyRequest(req: Request, rawBody: string): Promise<boolean> {
  const receiver = getQstashReceiver();
  if (receiver) {
    const signature = req.headers.get("upstash-signature");
    if (!signature) return false;
    await receiver.verify({
      signature,
      body: rawBody,
      url: req.url,
    });
    return true;
  }

  const internalSecret = process.env.AUTO_COMMENT_INTERNAL_SECRET?.trim() || "";
  if (!internalSecret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${internalSecret}`;
}

function parsePayload(rawBody: string): QueuedAutoCommentPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as Partial<QueuedAutoCommentPayload>;
    if (
      typeof parsed.articleId !== "string" ||
      !parsed.articleId.trim() ||
      typeof parsed.marketId !== "number" ||
      !Number.isFinite(parsed.marketId) ||
      typeof parsed.slotIndex !== "number" ||
      !Number.isInteger(parsed.slotIndex) ||
      parsed.slotIndex < 0 ||
      typeof parsed.delayMinutes !== "number" ||
      !Number.isFinite(parsed.delayMinutes) ||
      typeof parsed.publishedAtIso !== "string" ||
      !parsed.publishedAtIso ||
      typeof parsed.dueAtIso !== "string" ||
      !parsed.dueAtIso
    ) {
      return null;
    }
    return {
      articleId: parsed.articleId,
      marketId: parsed.marketId,
      slotIndex: parsed.slotIndex,
      delayMinutes: parsed.delayMinutes,
      publishedAtIso: parsed.publishedAtIso,
      dueAtIso: parsed.dueAtIso,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  try {
    const ok = await verifyRequest(req, rawBody);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    console.error("auto_comment_worker_verify_failed", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await processQueuedArticleAutoComment({
      articleId: payload.articleId,
      marketId: payload.marketId,
      slotIndex: payload.slotIndex,
      publishedAtIso: payload.publishedAtIso,
      now: new Date(),
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("auto_comment_worker_failed", error);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
