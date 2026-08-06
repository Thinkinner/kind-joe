import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize";
import { runIdleNudgeCheck } from "@/lib/admin/idle-nudge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  if (!authorizeCronRequest(request)) {
    console.warn("[cron/slack-idle-nudge] unauthorized", {
      hasAuth: Boolean(request.headers.get("authorization")),
      hasCronSecret: Boolean((process.env.CRON_SECRET || "").trim()),
      userAgent: request.headers.get("user-agent"),
      cronSchedule: request.headers.get("x-vercel-cron-schedule"),
      legacyCron: request.headers.get("x-vercel-cron"),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const result = await runIdleNudgeCheck({ dryRun });
    console.info("[cron/slack-idle-nudge]", {
      dryRun,
      ok: result.ok,
      reason: "reason" in result ? result.reason : undefined,
      eligible: "eligible" in result ? result.eligible : undefined,
      nudged: "nudged" in result ? result.nudged.length : 0,
    });
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/slack-idle-nudge] failed", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
