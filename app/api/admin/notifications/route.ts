import { NextResponse } from "next/server";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  countUnreadAdminNotifications,
  listAdminNotificationsForUser,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
} from "@/lib/admin/notifications";

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    listAdminNotificationsForUser(staff.user.id, 25),
    countUnreadAdminNotifications(staff.user.id),
  ]);

  return NextResponse.json({
    unreadCount,
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      readAt: item.readAt?.toISOString?.() ?? item.readAt ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    notificationId?: number;
  };

  if (body.action === "mark_all_read") {
    await markAllAdminNotificationsRead(staff.user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_read" && body.notificationId) {
    await markAdminNotificationRead(staff.user.id, body.notificationId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
