import { NextResponse } from "next/server";
import { getSourceFirstWorkerStatus } from "@/lib/agents/source-first-worker-status";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLES);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const status = await getSourceFirstWorkerStatus();
  return NextResponse.json({ success: true, status });
}
