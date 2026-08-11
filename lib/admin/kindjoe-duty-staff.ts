import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import {
  linkAssignments,
  staffDutyCheckins,
  staffSlackLinks,
} from "@/db/schema";
import { dutyDateInLA } from "@/lib/admin/duty-date";

/**
 * Duty check-ins use LA calendar dates. During the PH overnight window the LA
 * "today" can lag, so include yesterday too — but today's check-in always wins.
 */
export function dutyDatesForOpsWindow(now = new Date()): {
  today: string;
  dates: string[];
} {
  const today = dutyDateInLA(now);
  const yesterday = dutyDateInLA(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const dates = yesterday === today ? [today] : [today, yesterday];
  return { today, dates };
}

export type KindJoeDutyStaffRow = {
  id: number;
  userId: string;
  dutyDate: string;
  workingToday: boolean;
  workingKindJoe: boolean;
  checkedInAt: Date;
  lastContentAt: Date | null;
  lastNudgeAt: Date | null;
  slackUserId: string | null;
};

export type DutyCheckinLike = {
  id: number;
  userId: string;
  dutyDate: string;
  workingToday: boolean;
  workingKindJoe: boolean;
  checkedInAt: Date | string;
  lastContentAt: Date | string | null;
  lastNudgeAt: Date | string | null;
  slackUserId: string | null;
};

/**
 * Pick the authoritative check-in for assign/nudge.
 * Today's LA check-in always wins (even when off-duty).
 */
export function pickAuthoritativeDutyCheckin<T extends DutyCheckinLike>(
  userRows: T[],
  today: string,
): T | null {
  if (!userRows.length) return null;
  const todayRow = userRows.find((r) => r.dutyDate === today);
  if (todayRow) return todayRow;
  return (
    userRows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime(),
      )[0] ?? null
  );
}

/**
 * People eligible for Kind Joe link assign + idle nudge.
 *
 * If someone already checked in for LA today, that row is authoritative —
 * yesterday's "working Kind Joe" is ignored when today's status is off.
 * Only fall back to yesterday when there is no check-in for today yet.
 */
export async function listActiveKindJoeDutyStaff(
  now = new Date(),
): Promise<KindJoeDutyStaffRow[]> {
  const { today, dates } = dutyDatesForOpsWindow(now);

  const rows = await db
    .select({
      id: staffDutyCheckins.id,
      userId: staffDutyCheckins.userId,
      dutyDate: staffDutyCheckins.dutyDate,
      workingToday: staffDutyCheckins.workingToday,
      workingKindJoe: staffDutyCheckins.workingKindJoe,
      checkedInAt: staffDutyCheckins.checkedInAt,
      lastContentAt: staffDutyCheckins.lastContentAt,
      lastNudgeAt: staffDutyCheckins.lastNudgeAt,
      slackUserId: staffSlackLinks.slackUserId,
    })
    .from(staffDutyCheckins)
    .leftJoin(
      staffSlackLinks,
      eq(staffSlackLinks.userId, staffDutyCheckins.userId),
    )
    .where(inArray(staffDutyCheckins.dutyDate, dates));

  const byUser = new Map<string, (typeof rows)[number][]>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const active: KindJoeDutyStaffRow[] = [];

  for (const userRows of byUser.values()) {
    const chosen = pickAuthoritativeDutyCheckin(userRows, today);
    if (!chosen) continue;
    if (!chosen.workingToday || !chosen.workingKindJoe) continue;

    active.push({
      id: chosen.id,
      userId: chosen.userId,
      dutyDate: chosen.dutyDate,
      workingToday: chosen.workingToday,
      workingKindJoe: chosen.workingKindJoe,
      checkedInAt: chosen.checkedInAt,
      lastContentAt: chosen.lastContentAt,
      lastNudgeAt: chosen.lastNudgeAt,
      slackUserId: chosen.slackUserId,
    });
  }

  return active;
}

export type DutyRosterPerson = {
  userId: string;
  name: string;
  alias: string | null;
  email: string | null;
  slackUserId: string | null;
  dutyDate: string | null;
  workingToday: boolean | null;
  workingKindJoe: boolean | null;
  checkedInAt: string | null;
  lastContentAt: string | null;
  lastNudgeAt: string | null;
  openAssignments: number;
  status:
    | "kindjoe"
    | "working_other"
    | "not_working"
    | "not_checked_in";
};

/** Admin roster for LA duty date (who is on Kind Joe / working / off / missing). */
export async function listKindJoeDutyRoster(
  now = new Date(),
): Promise<{
  dutyDate: string;
  timezone: string;
  people: DutyRosterPerson[];
}> {
  const dutyDate = dutyDateInLA(now);

  const staff = await db
    .select({
      userId: authUser.id,
      name: authUser.name,
      alias: authUser.aliasFullName,
      email: authUser.email,
      slackUserId: staffSlackLinks.slackUserId,
    })
    .from(authUser)
    .leftJoin(staffSlackLinks, eq(staffSlackLinks.userId, authUser.id))
    .where(eq(authUser.accountType, "staff"))
    .orderBy(authUser.name);

  const checkins = await db
    .select()
    .from(staffDutyCheckins)
    .where(eq(staffDutyCheckins.dutyDate, dutyDate));

  const checkinByUser = new Map(checkins.map((c) => [c.userId, c]));

  const staffIds = staff.map((s) => s.userId);
  const openCounts =
    staffIds.length === 0
      ? []
      : await db
          .select({
            userId: linkAssignments.assigneeUserId,
            openCount: sql<number>`count(*)::int`.as("open_count"),
          })
          .from(linkAssignments)
          .where(
            and(
              inArray(linkAssignments.assigneeUserId, staffIds),
              eq(linkAssignments.status, "assigned"),
            ),
          )
          .groupBy(linkAssignments.assigneeUserId);

  const openMap = new Map(
    openCounts.map((r) => [r.userId, Number(r.openCount)]),
  );

  const people: DutyRosterPerson[] = staff.map((s) => {
    const checkin = checkinByUser.get(s.userId) ?? null;
    let status: DutyRosterPerson["status"] = "not_checked_in";
    if (checkin) {
      if (!checkin.workingToday) status = "not_working";
      else if (checkin.workingKindJoe) status = "kindjoe";
      else status = "working_other";
    }

    return {
      userId: s.userId,
      name: (s.name ?? "").trim() || "Staff",
      alias: (s.alias ?? "").trim() || null,
      email: s.email ?? null,
      slackUserId: s.slackUserId ?? null,
      dutyDate: checkin?.dutyDate ?? null,
      workingToday: checkin?.workingToday ?? null,
      workingKindJoe: checkin?.workingKindJoe ?? null,
      checkedInAt: checkin?.checkedInAt
        ? new Date(checkin.checkedInAt).toISOString()
        : null,
      lastContentAt: checkin?.lastContentAt
        ? new Date(checkin.lastContentAt).toISOString()
        : null,
      lastNudgeAt: checkin?.lastNudgeAt
        ? new Date(checkin.lastNudgeAt).toISOString()
        : null,
      openAssignments: openMap.get(s.userId) ?? 0,
      status,
    };
  });

  people.sort((a, b) => {
    const order = {
      kindjoe: 0,
      working_other: 1,
      not_working: 2,
      not_checked_in: 3,
    } as const;
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return {
    dutyDate,
    timezone: "America/Los_Angeles",
    people,
  };
}

/** Open assignment counts for ranking assignees. */
export async function getAssigneeWorkload(userIds: string[]) {
  if (!userIds.length) {
    return {
      openMap: new Map<string, number>(),
      lastMap: new Map<string, number>(),
    };
  }

  const openCounts = await db
    .select({
      userId: linkAssignments.assigneeUserId,
      openCount: sql<number>`count(*)::int`.as("open_count"),
    })
    .from(linkAssignments)
    .where(
      and(
        inArray(linkAssignments.assigneeUserId, userIds),
        eq(linkAssignments.status, "assigned"),
      ),
    )
    .groupBy(linkAssignments.assigneeUserId);

  const lastAssigned = await db
    .select({
      userId: linkAssignments.assigneeUserId,
      lastAt: sql<Date>`max(${linkAssignments.assignedAt})`.as("last_at"),
    })
    .from(linkAssignments)
    .where(inArray(linkAssignments.assigneeUserId, userIds))
    .groupBy(linkAssignments.assigneeUserId);

  return {
    openMap: new Map(
      openCounts.map((r) => [r.userId, Number(r.openCount)]),
    ),
    lastMap: new Map(
      lastAssigned.map((r) => [
        r.userId,
        r.lastAt ? new Date(r.lastAt).getTime() : 0,
      ]),
    ),
  };
}
