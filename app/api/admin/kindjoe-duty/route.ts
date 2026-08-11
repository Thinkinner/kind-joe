import { NextResponse } from "next/server";
import { z } from "zod";
import { dutyDateInLA, laWeekdayKey } from "@/lib/admin/duty-date";
import { getIdleMentionCountdownsForStaff } from "@/lib/admin/idle-nudge";
import {
  ensureDefaultAssignSchedules,
  listAssignSchedules,
  listWeightedAssignCandidates,
  upsertAssignSchedule,
} from "@/lib/admin/kindjoe-assign-schedule";
import { listKindJoeDutyRoster } from "@/lib/admin/kindjoe-duty-staff";
import { upsertDutyCheckin } from "@/lib/admin/link-assignments";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const weightSchema = z.number().int().min(0).max(100);

const scheduleSchema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
  weights: z.object({
    mon: weightSchema,
    tue: weightSchema,
    wed: weightSchema,
    thu: weightSchema,
    fri: weightSchema,
    sat: weightSchema,
    sun: weightSchema,
  }),
  notes: z.string().max(500).nullable().optional(),
});

const statusSchema = z.object({
  action: z.literal("set_status"),
  userId: z.string().min(1),
  workingToday: z.boolean(),
  workingKindJoe: z.boolean(),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  await ensureDefaultAssignSchedules(staff.user.id);

  const [roster, schedules, candidates] = await Promise.all([
    listKindJoeDutyRoster(),
    listAssignSchedules(),
    listWeightedAssignCandidates(),
  ]);
  const countdowns = await getIdleMentionCountdownsForStaff(roster.people);

  return NextResponse.json({
    ...roster,
    weekday: laWeekdayKey(),
    schedules,
    assignPool: candidates,
    countdowns,
  });
}

export async function PATCH(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.action === "seed_defaults") {
    const result = await ensureDefaultAssignSchedules(staff.user.id);
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "set_status") {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const checkin = await upsertDutyCheckin({
      userId: parsed.data.userId,
      workingToday: parsed.data.workingToday,
      workingKindJoe: parsed.data.workingKindJoe,
      dutyDate: dutyDateInLA(),
    });
    return NextResponse.json({
      ok: true,
      checkin: {
        userId: checkin.userId,
        dutyDate: checkin.dutyDate,
        workingToday: checkin.workingToday,
        workingKindJoe: checkin.workingKindJoe,
      },
    });
  }

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const row = await upsertAssignSchedule({
    ...parsed.data,
    updatedByUserId: staff.user.id,
  });

  return NextResponse.json({
    ok: true,
    schedule: {
      userId: row.userId,
      enabled: row.enabled,
      weights: {
        mon: row.monWeight,
        tue: row.tueWeight,
        wed: row.wedWeight,
        thu: row.thuWeight,
        fri: row.friWeight,
        sat: row.satWeight,
        sun: row.sunWeight,
      },
      notes: row.notes,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
