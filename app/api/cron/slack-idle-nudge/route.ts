import { NextResponse } from "next/server";
import { runIdleNudgeCheck } from "@/lib/admin/idle-nudge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (process.env.NODE_ENV === "production" && vercelCronHeader) return true;

  const authHeader = request.headers.get("authorization");
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIdleNudgeCheck();
    console.info("[cron/slack-idle-nudge]", result);
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
