import { NextResponse } from "next/server";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";
import { authorizeCronRequest } from "@/lib/cron/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseIngestLimit(request: Request): number | undefined {
  const { searchParams } = new URL(request.url);
  const raw = Number(
    searchParams.get("ingestLimit") || searchParams.get("limit") || "",
  );
  if (!Number.isFinite(raw)) return undefined;
  return Math.trunc(raw);
}

export async function POST(request: Request) {
  if (!authorizeCronRequest(request)) {
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
