import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  createSourceFirstArticleJob,
  normalizeWritingMode,
} from "@/lib/agents/source-first-article-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLES);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      topic?: unknown;
      adsenseReady?: unknown;
      writingMode?: unknown;
    };
    const topic = String(body.topic ?? "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    const job = await createSourceFirstArticleJob({
      topic,
      createdBy: staff.user.id,
      adsenseReady: body.adsenseReady === true,
      writingMode: normalizeWritingMode(body.writingMode),
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
    });
  } catch (error) {
    console.error("source-first job create failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
