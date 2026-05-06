import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use /api/admin/social-profiles/[id]/links/[linkId].",
    },
    { status: 410 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use /api/admin/social-profiles/[id]/links/[linkId].",
    },
    { status: 410 },
  );
}
