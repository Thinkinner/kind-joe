import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import {
  kindjoeAssignSchedules,
  staffDutyCheckins,
  staffSlackLinks,
} from "@/db/schema";
import {
  dutyDateInLA,
  laWeekdayKey,
  type LaWeekdayKey,
} from "@/lib/admin/duty-date";
import { getAssigneeWorkload } from "@/lib/admin/kindjoe-duty-staff";

export type DayWeights = {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
};

export type AssignScheduleRow = {
  userId: string;
  enabled: boolean;
  weights: DayWeights;
  notes: string | null;
  updatedAt: string;
};

const WEIGHT_MIN = 0;
const WEIGHT_MAX = 100;

export function clampAssignWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, Math.round(value)));
}

export function emptyWeights(): DayWeights {
  return { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
}

export function weekdayWeightsFullWeekdays(): DayWeights {
  return { mon: 100, tue: 100, wed: 100, thu: 100, fri: 100, sat: 0, sun: 0 };
}

function weightsFromRow(row: {
  monWeight: number;
  tueWeight: number;
  wedWeight: number;
  thuWeight: number;
  friWeight: number;
  satWeight: number;
  sunWeight: number;
}): DayWeights {
  return {
    mon: clampAssignWeight(row.monWeight),
    tue: clampAssignWeight(row.tueWeight),
    wed: clampAssignWeight(row.wedWeight),
    thu: clampAssignWeight(row.thuWeight),
    fri: clampAssignWeight(row.friWeight),
    sat: clampAssignWeight(row.satWeight),
    sun: clampAssignWeight(row.sunWeight),
  };
}

export function weightForWeekday(
  weights: DayWeights,
  day: LaWeekdayKey,
): number {
  return clampAssignWeight(weights[day] ?? 0);
}

/**
 * Weighted lottery. Higher weight = more of the links.
 * Softly prefer people with fewer open assignments.
 */
export function pickWeightedAssignee(
  candidates: Array<{ userId: string; weight: number; openCount: number }>,
  random = Math.random,
): string | null {
  const scored = candidates
    .map((c) => ({
      userId: c.userId,
      score: Math.max(0, c.weight) / (1 + Math.max(0, c.openCount)),
    }))
    .filter((c) => c.score > 0);

  if (!scored.length) return null;

  const total = scored.reduce((sum, c) => sum + c.score, 0);
  if (total <= 0) return null;

  let tick = random() * total;
  for (const c of scored) {
    tick -= c.score;
    if (tick <= 0) return c.userId;
  }
  return scored[scored.length - 1]?.userId ?? null;
}

export async function listAssignSchedules(): Promise<AssignScheduleRow[]> {
  const rows = await db.select().from(kindjoeAssignSchedules);
  return rows.map((row) => ({
    userId: row.userId,
    enabled: row.enabled,
    weights: weightsFromRow(row),
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function upsertAssignSchedule(input: {
  userId: string;
  enabled: boolean;
  weights: DayWeights;
  notes?: string | null;
  updatedByUserId?: string | null;
}) {
  const now = new Date();
  const weights = {
    monWeight: clampAssignWeight(input.weights.mon),
    tueWeight: clampAssignWeight(input.weights.tue),
    wedWeight: clampAssignWeight(input.weights.wed),
    thuWeight: clampAssignWeight(input.weights.thu),
    friWeight: clampAssignWeight(input.weights.fri),
    satWeight: clampAssignWeight(input.weights.sat),
    sunWeight: clampAssignWeight(input.weights.sun),
  };

  const [row] = await db
    .insert(kindjoeAssignSchedules)
    .values({
      userId: input.userId,
      enabled: input.enabled,
      ...weights,
      notes: input.notes?.trim() || null,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .onConflictDoUpdate({
      target: kindjoeAssignSchedules.userId,
      set: {
        enabled: input.enabled,
        ...weights,
        notes: input.notes?.trim() || null,
        updatedAt: now,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    })
    .returning();

  return row;
}

/** Known Kind Joe link-assign defaults (matched by staff name/alias/email). */
export const DEFAULT_ASSIGN_SCHEDULE_PRESETS: Array<{
  match: RegExp;
  enabled: boolean;
  weights: DayWeights;
  notes: string;
}> = [
  {
    // Vince Pajaron / Beige Parker — poster Mon–Wed at ~20% of links
    match: /vince|beige\s*parker|pajaron/i,
    enabled: true,
    weights: {
      mon: 20,
      tue: 20,
      wed: 20,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0,
    },
    notes: "Poster Mon–Wed · ~20% of links (LA)",
  },
  {
    match: /^jean\b/i,
    enabled: true,
    weights: weekdayWeightsFullWeekdays(),
    notes: "Mon–Fri full links (LA)",
  },
  {
    match: /dee\s*jay|dell\s*jay/i,
    enabled: true,
    weights: weekdayWeightsFullWeekdays(),
    notes: "Mon–Fri full links (LA)",
  },
  {
    // Charlyn: full Mon–Wed, ~25% Thu–Fri (poster those days)
    match: /charlyn/i,
    enabled: true,
    weights: {
      mon: 100,
      tue: 100,
      wed: 100,
      thu: 25,
      fri: 25,
      sat: 0,
      sun: 0,
    },
    notes: "Mon–Wed full · Thu–Fri ~25% (poster) (LA)",
  },
];

export async function ensureDefaultAssignSchedules(updatedByUserId?: string | null) {
  const staff = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      alias: authUser.aliasFullName,
      email: authUser.email,
    })
    .from(authUser)
    .where(eq(authUser.accountType, "staff"));

  const existing = await db.select({ userId: kindjoeAssignSchedules.userId }).from(
    kindjoeAssignSchedules,
  );
  const have = new Set(existing.map((r) => r.userId));

  const created: string[] = [];

  for (const person of staff) {
    if (have.has(person.id)) continue;
    const haystack = `${person.name} ${person.alias ?? ""} ${person.email ?? ""}`;
    const preset = DEFAULT_ASSIGN_SCHEDULE_PRESETS.find((p) =>
      p.match.test(haystack),
    );
    if (!preset) continue;

    await upsertAssignSchedule({
      userId: person.id,
      enabled: preset.enabled,
      weights: preset.weights,
      notes: preset.notes,
      updatedByUserId,
    });
    created.push(person.id);
  }

  return { created: created.length };
}

export type AssignCandidate = {
  userId: string;
  slackUserId: string | null;
  weight: number;
  openCount: number;
  source: "schedule" | "checkin" | "schedule+checkin";
};

/**
 * Build today's LA assign pool:
 * - Schedule weight for weekday (0 = off)
 * - Daily check-in can opt out (not working / not Kind Joe)
 * - No check-in + schedule weight > 0 still eligible (defaults)
 * - Kind Joe check-in with no schedule → weight 100
 */
export async function listWeightedAssignCandidates(
  now = new Date(),
): Promise<AssignCandidate[]> {
  const dutyDate = dutyDateInLA(now);
  const day = laWeekdayKey(now);

  const staff = await db
    .select({
      userId: authUser.id,
      slackUserId: staffSlackLinks.slackUserId,
    })
    .from(authUser)
    .leftJoin(staffSlackLinks, eq(staffSlackLinks.userId, authUser.id))
    .where(eq(authUser.accountType, "staff"));

  if (!staff.length) return [];

  const userIds = staff.map((s) => s.userId);
  const [schedules, checkins, workload] = await Promise.all([
    db
      .select()
      .from(kindjoeAssignSchedules)
      .where(inArray(kindjoeAssignSchedules.userId, userIds)),
    db
      .select()
      .from(staffDutyCheckins)
      .where(
        and(
          inArray(staffDutyCheckins.userId, userIds),
          eq(staffDutyCheckins.dutyDate, dutyDate),
        ),
      ),
    getAssigneeWorkload(userIds),
  ]);

  const scheduleByUser = new Map(schedules.map((s) => [s.userId, s]));
  const checkinByUser = new Map(checkins.map((c) => [c.userId, c]));

  const candidates: AssignCandidate[] = [];

  for (const person of staff) {
    const checkin = checkinByUser.get(person.userId) ?? null;
    if (checkin && (!checkin.workingToday || !checkin.workingKindJoe)) {
      continue;
    }

    const schedule = scheduleByUser.get(person.userId) ?? null;
    let weight = 0;
    let source: AssignCandidate["source"] = "checkin";

    if (schedule?.enabled) {
      weight = weightForWeekday(weightsFromRow(schedule), day);
      source = checkin ? "schedule+checkin" : "schedule";
    } else if (checkin?.workingToday && checkin.workingKindJoe) {
      weight = 100;
      source = "checkin";
    }

    if (weight <= 0) continue;

    candidates.push({
      userId: person.userId,
      slackUserId: person.slackUserId ?? null,
      weight,
      openCount: workload.openMap.get(person.userId) ?? 0,
      source,
    });
  }

  return candidates;
}

export async function pickAssigneeUserIdWeighted(
  now = new Date(),
): Promise<string | null> {
  const candidates = await listWeightedAssignCandidates(now);
  return pickWeightedAssignee(candidates);
}
