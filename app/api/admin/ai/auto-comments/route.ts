import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { processScheduledArticleAutoComments } from "@/lib/automation/article-auto-comments";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  forceDue: z.boolean().optional(),
  latestOnly: z.boolean().optional(),
});

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
