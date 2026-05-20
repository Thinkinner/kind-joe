import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { runRssAutoWriter } from "@/lib/agents/rss-auto-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(
    searchParams.get("ingestLimit") || searchParams.get("limit") || "",
  );
  const ingestLimit = Number.isFinite(limitRaw)
    ? Math.trunc(limitRaw)
    : undefined;
  const writerMaxRaw = Number(searchParams.get("writerMax") || "");
  const writerMaxPerRun = Number.isFinite(writerMaxRaw)
    ? Math.trunc(writerMaxRaw)
    : undefined;
  const mode = (searchParams.get("mode") || "full").toLowerCase();
  const ingestEnabled = mode !== "writer";
  const writerEnabled = mode !== "ingest";

  try {
    const summary = await runRssAutoWriter({
      ingestLimit,
      writerMaxPerRun,
      ingestEnabled,
      writerEnabled,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("admin rss-auto-writer run failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
