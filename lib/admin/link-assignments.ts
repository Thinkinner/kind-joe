import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import {
  linkAssignments,
  staffDutyCheckins,
  staffSlackLinks,
} from "@/db/schema";
import { dutyDateInLA } from "@/lib/admin/duty-date";
import { pickAssigneeUserIdWeighted } from "@/lib/admin/kindjoe-assign-schedule";
import { createTargetedAdminNotification } from "@/lib/admin/notifications";

export type LinkAssignmentStatus = "assigned" | "done" | "skipped";

export async function getDutyCheckinForUser(userId: string, dutyDate = dutyDateInLA()) {
  const [row] = await db
    .select()
    .from(staffDutyCheckins)
    .where(
      and(
        eq(staffDutyCheckins.userId, userId),
        eq(staffDutyCheckins.dutyDate, dutyDate),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertDutyCheckin(input: {
  userId: string;
  workingToday: boolean;
  workingKindJoe: boolean;
  dutyDate?: string;
}) {
  const dutyDate = input.dutyDate ?? dutyDateInLA();
  const workingToday = input.workingToday;
  const workingKindJoe = workingToday ? input.workingKindJoe : false;
  const now = new Date();

  const [row] = await db
    .insert(staffDutyCheckins)
    .values({
      userId: input.userId,
      dutyDate,
      workingToday,
      workingKindJoe,
      checkedInAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [staffDutyCheckins.userId, staffDutyCheckins.dutyDate],
      set: {
        workingToday,
        workingKindJoe,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

async function pickAssigneeUserId(): Promise<string | null> {
  return pickAssigneeUserIdWeighted();
}

export async function assignSlackLink(input: {
  url: string;
  slackChannelId: string;
  slackMessageTs: string;
  postedBySlackUserId?: string | null;
}) {
  const assigneeUserId = await pickAssigneeUserId();
  if (!assigneeUserId) {
    return { ok: false as const, reason: "no_available_staff" as const };
  }

  try {
    const [assignment] = await db
      .insert(linkAssignments)
      .values({
        url: input.url,
        slackChannelId: input.slackChannelId,
        slackMessageTs: input.slackMessageTs,
        postedBySlackUserId: input.postedBySlackUserId ?? null,
        assigneeUserId,
        status: "assigned",
      })
      .returning();

    const [slackLink] = await db
      .select()
      .from(staffSlackLinks)
      .where(eq(staffSlackLinks.userId, assigneeUserId))
      .limit(1);

    const [assignee] = await db
      .select({
        id: authUser.id,
        name: authUser.name,
        aliasFullName: authUser.aliasFullName,
      })
      .from(authUser)
      .where(eq(authUser.id, assigneeUserId))
      .limit(1);

    try {
      await createTargetedAdminNotification(assigneeUserId, {
        type: "link_assignment",
        title: "New link assigned",
        body: input.url,
        href: "/admin/assigned-links",
        meta: {
          assignmentId: assignment.id,
          url: input.url,
        },
        emailSubject: "Kind Joe: new link assigned to you",
      });
    } catch (error) {
      console.error("link assignment notification failed:", error);
    }

    return {
      ok: true as const,
      assignment,
      slackUserId: slackLink?.slackUserId ?? null,
      assigneeName:
        (assignee?.aliasFullName ?? "").trim() ||
        (assignee?.name ?? "").trim() ||
        "teammate",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("link_assignments_msg_url_uq") || message.includes("duplicate")) {
      return { ok: false as const, reason: "already_assigned" as const };
    }
    throw error;
  }
}

export async function listLinkAssignmentsForUser(input: {
  userId: string;
  viewerCanSeeAll: boolean;
  status?: LinkAssignmentStatus | "all";
  limit?: number;
}) {
  const limit = input.limit ?? 50;
  const status = input.status ?? "assigned";

  const baseSelect = {
    id: linkAssignments.id,
    url: linkAssignments.url,
    slackChannelId: linkAssignments.slackChannelId,
    slackMessageTs: linkAssignments.slackMessageTs,
    postedBySlackUserId: linkAssignments.postedBySlackUserId,
    assigneeUserId: linkAssignments.assigneeUserId,
    status: linkAssignments.status,
    assignedAt: linkAssignments.assignedAt,
    completedAt: linkAssignments.completedAt,
    assigneeName: authUser.name,
    assigneeAlias: authUser.aliasFullName,
  };

  const filters = [];
  if (!input.viewerCanSeeAll) {
    filters.push(eq(linkAssignments.assigneeUserId, input.userId));
  }
  if (status !== "all") {
    filters.push(eq(linkAssignments.status, status));
  }

  const rows = await db
    .select(baseSelect)
    .from(linkAssignments)
    .innerJoin(authUser, eq(authUser.id, linkAssignments.assigneeUserId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(linkAssignments.assignedAt))
    .limit(limit);

  return rows;
}

export async function countOpenLinkAssignmentsForUser(userId: string) {
  const [row] = await db
    .select({ count: count(linkAssignments.id) })
    .from(linkAssignments)
    .where(
      and(
        eq(linkAssignments.assigneeUserId, userId),
        eq(linkAssignments.status, "assigned"),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function countLinkAssignmentsByStatusForUser(userId: string) {
  const rows = await db
    .select({
      status: linkAssignments.status,
      count: count(linkAssignments.id),
    })
    .from(linkAssignments)
    .where(eq(linkAssignments.assigneeUserId, userId))
    .groupBy(linkAssignments.status);

  const counts = {
    assigned: 0,
    done: 0,
    skipped: 0,
  };
  for (const row of rows) {
    if (row.status === "assigned" || row.status === "done" || row.status === "skipped") {
      counts[row.status] = Number(row.count);
    }
  }
  return counts;
}

export async function updateLinkAssignmentStatus(input: {
  id: number;
  userId: string;
  viewerCanSeeAll: boolean;
  status: "done" | "skipped";
}) {
  const [existing] = await db
    .select()
    .from(linkAssignments)
    .where(eq(linkAssignments.id, input.id))
    .limit(1);

  if (!existing) return { ok: false as const, reason: "not_found" as const };
  if (!input.viewerCanSeeAll && existing.assigneeUserId !== input.userId) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  const [updated] = await db
    .update(linkAssignments)
    .set({
      status: input.status,
      completedAt: new Date(),
    })
    .where(eq(linkAssignments.id, input.id))
    .returning();

  return { ok: true as const, assignment: updated };
}

export async function getStaffSlackUserId(userId: string) {
  const [row] = await db
    .select()
    .from(staffSlackLinks)
    .where(eq(staffSlackLinks.userId, userId))
    .limit(1);
  return row?.slackUserId ?? null;
}

export async function upsertStaffSlackLink(userId: string, slackUserId: string) {
  const normalized = slackUserId.trim();
  const [row] = await db
    .insert(staffSlackLinks)
    .values({
      userId,
      slackUserId: normalized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: staffSlackLinks.userId,
      set: {
        slackUserId: normalized,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function deleteStaffSlackLink(userId: string) {
  await db.delete(staffSlackLinks).where(eq(staffSlackLinks.userId, userId));
}

export async function listStaffSlackLinks() {
  return db
    .select({
      userId: staffSlackLinks.userId,
      slackUserId: staffSlackLinks.slackUserId,
      updatedAt: staffSlackLinks.updatedAt,
      name: authUser.name,
      email: authUser.email,
    })
    .from(staffSlackLinks)
    .innerJoin(authUser, eq(authUser.id, staffSlackLinks.userId))
    .orderBy(asc(authUser.name));
}
