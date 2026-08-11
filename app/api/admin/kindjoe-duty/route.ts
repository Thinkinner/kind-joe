import { NextResponse } from "next/server";
import { listKindJoeDutyRoster } from "@/lib/admin/kindjoe-duty-staff";
import { getIdleMentionCountdownsForStaff } from "@/lib/admin/idle-nudge";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const roster = await listKindJoeDutyRoster();
  const countdowns = await getIdleMentionCountdownsForStaff(roster.people);
  return NextResponse.json({ ...roster, countdowns });
}
