import { NextResponse } from "next/server";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: Request): boolean {
  // Allow Vercel Cron invocations in production.
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (process.env.NODE_ENV === "production" && vercelCronHeader) return true;

  // Keep bearer-token auth for Railway/manual triggers.
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

function parseIngestLimit(request: Request): number | undefined {
  const { searchParams } = new URL(request.url);
  const raw = Number(
    searchParams.get("ingestLimit") || searchParams.get("limit") || "",
  );
  if (!Number.isFinite(raw)) return undefined;
  return Math.trunc(raw);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runRssAutoWriter({
      ingestLimit: parseIngestLimit(request),
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("rss-auto-writer failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
