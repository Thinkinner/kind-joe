import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS, userHasPermission } from "@/lib/auth/permissions";
import {
  countLinkAssignmentsByStatusForUser,
  countOpenLinkAssignmentsForUser,
  listLinkAssignmentsForUser,
  updateLinkAssignmentStatus,
} from "@/lib/admin/link-assignments";

function canSeeAllAssignments(user: Parameters<typeof userHasPermission>[0]) {
  return (
    userHasPermission(user, PERMISSIONS.ADMIN_USERS) ||
    userHasPermission(user, PERMISSIONS.ADMIN_SUPERADMIN)
  );
}

export async function GET(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ASSIGNED_LINKS);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? "assigned";
  const status =
    statusParam === "all" ||
    statusParam === "assigned" ||
    statusParam === "done" ||
    statusParam === "skipped"
      ? statusParam
      : "assigned";

  const viewerCanSeeAll = canSeeAllAssignments(staff.user);
  const mineOnly = searchParams.get("mine") === "1";
  const [items, openCount, statusCounts] = await Promise.all([
    listLinkAssignmentsForUser({
      userId: staff.user.id,
      viewerCanSeeAll: mineOnly ? false : viewerCanSeeAll,
      status,
      limit: 100,
    }),
    countOpenLinkAssignmentsForUser(staff.user.id),
    countLinkAssignmentsByStatusForUser(staff.user.id),
  ]);

  return NextResponse.json({
    openCount,
    doneCount: statusCounts.done,
    skippedCount: statusCounts.skipped,
    viewerCanSeeAll,
    items: items.map((item) => ({
      ...item,
      assignedAt: item.assignedAt?.toISOString?.() ?? item.assignedAt,
      completedAt: item.completedAt?.toISOString?.() ?? item.completedAt ?? null,
    })),
  });
}

const PatchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["done", "skipped"]),
});

export async function PATCH(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ASSIGNED_LINKS);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const result = await updateLinkAssignmentStatus({
    id: parsed.data.id,
    userId: staff.user.id,
    viewerCanSeeAll: canSeeAllAssignments(staff.user),
    status: parsed.data.status,
  });

  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    assignment: {
      ...result.assignment,
      assignedAt:
        result.assignment.assignedAt?.toISOString?.() ??
        result.assignment.assignedAt,
      completedAt:
        result.assignment.completedAt?.toISOString?.() ??
        result.assignment.completedAt ??
        null,
    },
  });
}
