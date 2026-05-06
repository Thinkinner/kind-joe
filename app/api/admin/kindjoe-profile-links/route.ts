import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use /api/admin/social-profiles and /api/admin/social-profiles/[id]/links.",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use /api/admin/social-profiles and /api/admin/social-profiles/[id]/links.",
    },
    { status: 410 },
  );
}
