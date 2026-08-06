import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dutyDateInLA } from "@/lib/admin/duty-date";
import {
  getDutyCheckinForUser,
  upsertDutyCheckin,
} from "@/lib/admin/link-assignments";

const PostSchema = z.object({
  workingToday: z.boolean(),
  workingKindJoe: z.boolean().optional(),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dutyDate = dutyDateInLA();
  const checkin = await getDutyCheckinForUser(staff.user.id, dutyDate);

  return NextResponse.json({
    dutyDate,
    timezone: "America/Los_Angeles",
    checkin: checkin
      ? {
          workingToday: checkin.workingToday,
          workingKindJoe: checkin.workingKindJoe,
          checkedInAt: checkin.checkedInAt?.toISOString?.() ?? checkin.checkedInAt,
          updatedAt: checkin.updatedAt?.toISOString?.() ?? checkin.updatedAt,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const workingToday = parsed.data.workingToday;
  const workingKindJoe = workingToday
    ? Boolean(parsed.data.workingKindJoe)
    : false;

  const checkin = await upsertDutyCheckin({
    userId: staff.user.id,
    workingToday,
    workingKindJoe,
  });

  return NextResponse.json({
    ok: true,
    dutyDate: checkin.dutyDate,
    checkin: {
      workingToday: checkin.workingToday,
      workingKindJoe: checkin.workingKindJoe,
      checkedInAt: checkin.checkedInAt?.toISOString?.() ?? checkin.checkedInAt,
      updatedAt: checkin.updatedAt?.toISOString?.() ?? checkin.updatedAt,
    },
  });
}
