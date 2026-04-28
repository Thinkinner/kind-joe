import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  listAutoCommentSchedules,
  processQueuedArticleAutoComment,
  processScheduledArticleAutoComments,
} from "@/lib/automation/article-auto-comments";

export const runtime = "nodejs";
export const maxDuration = 60;

const RunSchedulerSchema = z.object({
  action: z.literal("runScheduler").optional(),
  forceDue: z.boolean().optional(),
  latestOnly: z.boolean().optional(),
});

const RunSlotSchema = z.object({
  action: z.literal("runSlotNow"),
  articleId: z.string().min(1),
  marketId: z.number().int().positive().optional(),
  slotIndex: z.number().int().min(0),
  publishedAtIso: z.string().datetime().optional(),
  forceDue: z.boolean().optional(),
});

const BodySchema = z.union([RunSchedulerSchema, RunSlotSchema]);

const QuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLE_ASSISTANT);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params." }, { status: 400 });
  }

  const schedules = await listAutoCommentSchedules({
    limit: parsed.data.limit ?? 25,
    now: new Date(),
  });

  return NextResponse.json({
    ok: true,
    schedules,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLE_ASSISTANT);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 },
      );
    }

    if (parsed.data.action === "runSlotNow") {
      const result = await processQueuedArticleAutoComment({
        articleId: parsed.data.articleId,
        marketId: parsed.data.marketId,
        slotIndex: parsed.data.slotIndex,
        publishedAtIso: parsed.data.publishedAtIso,
        forceDue: parsed.data.forceDue === true,
        now: new Date(),
      });
      return NextResponse.json({
        ok: true,
        slotResult: result,
        triggeredAt: new Date().toISOString(),
      });
    }

    const result = await processScheduledArticleAutoComments({
      now: new Date(),
      forceDue: parsed.data.forceDue === true,
      latestOnly: parsed.data.latestOnly === true,
    });

    return NextResponse.json({
      ok: true,
      autoComments: result,
      triggeredAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auto-comment run failed";
    console.error("admin_auto_comments_run_failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
