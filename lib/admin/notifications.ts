import { and, desc, eq, isNotNull, ne, notExists, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminNotificationReads,
  adminNotifications,
} from "@/db/schema";
import { user as authUser } from "@/db/auth-schema";
import { parseStaffRolesFromDb } from "@/lib/auth/staff-roles";
import { sendAuthEmail } from "@/lib/email/resend";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";
import { publicSiteUrl } from "@/lib/site/public-site-url";

const NOTIFY_ROLES = new Set(["superadmin", "owner", "admin", "manager"]);

export type CreateAdminNotificationInput = {
  type: string;
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
  emailSubject?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getStaffNotifyEmails(): Promise<string[]> {
  const rows = await db
    .select({
      email: authUser.email,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
    })
    .from(authUser)
    .where(
      or(
        and(isNotNull(authUser.staffRole), ne(authUser.staffRole, "")),
        sql`coalesce(jsonb_array_length(${authUser.staffRoles}), 0) > 0`,
      ),
    );

  const emails = new Set<string>();
  for (const row of rows) {
    const roles = parseStaffRolesFromDb(row);
    if (!roles.some((role) => NOTIFY_ROLES.has(role))) continue;
    const email = row.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }

  emails.add(PUBLIC_CONTACT_EMAIL.toLowerCase());
  return [...emails];
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput,
) {
  const [notification] = await db
    .insert(adminNotifications)
    .values({
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      meta: input.meta ?? null,
    })
    .returning();

  // Email notify is best-effort — never fail the primary write path.
  try {
    const emails = await getStaffNotifyEmails();
    const subject = input.emailSubject ?? input.title;
    const absoluteHref = input.href
      ? input.href.startsWith("http")
        ? input.href
        : publicSiteUrl(input.href)
      : null;
    const hrefLine = absoluteHref
      ? `<p><a href="${escapeHtml(absoluteHref)}">Open in admin</a></p>`
      : "";
    const html = `
<p><strong>${escapeHtml(input.title)}</strong></p>
<p>${escapeHtml(input.body)}</p>
${hrefLine}
`.trim();
    const text = `${input.title}\n\n${input.body}${
      absoluteHref ? `\n\nOpen: ${absoluteHref}` : ""
    }`;

    await Promise.allSettled(
      emails.map((to) =>
        sendAuthEmail({
          to,
          subject,
          html,
          text,
        }),
      ),
    );
  } catch (error) {
    console.error("admin notification email failed:", error);
  }

  return notification;
}

export async function listAdminNotificationsForUser(
  userId: string,
  limit = 20,
) {
  const rows = await db
    .select({
      id: adminNotifications.id,
      type: adminNotifications.type,
      title: adminNotifications.title,
      body: adminNotifications.body,
      href: adminNotifications.href,
      createdAt: adminNotifications.createdAt,
      readAt: adminNotificationReads.readAt,
    })
    .from(adminNotifications)
    .leftJoin(
      adminNotificationReads,
      and(
        eq(adminNotificationReads.notificationId, adminNotifications.id),
        eq(adminNotificationReads.userId, userId),
      ),
    )
    .orderBy(desc(adminNotifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    unread: !row.readAt,
  }));
}

export async function countUnreadAdminNotifications(userId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(adminNotifications)
    .where(
      notExists(
        db
          .select({ one: sql`1` })
          .from(adminNotificationReads)
          .where(
            and(
              eq(
                adminNotificationReads.notificationId,
                adminNotifications.id,
              ),
              eq(adminNotificationReads.userId, userId),
            ),
          ),
      ),
    );

  return row?.count ?? 0;
}

export async function markAdminNotificationRead(
  userId: string,
  notificationId: number,
) {
  await db
    .insert(adminNotificationReads)
    .values({
      notificationId,
      userId,
    })
    .onConflictDoNothing();
}

export async function markAllAdminNotificationsRead(userId: string) {
  const unread = await db
    .select({ id: adminNotifications.id })
    .from(adminNotifications)
    .where(
      notExists(
        db
          .select({ one: sql`1` })
          .from(adminNotificationReads)
          .where(
            and(
              eq(
                adminNotificationReads.notificationId,
                adminNotifications.id,
              ),
              eq(adminNotificationReads.userId, userId),
            ),
          ),
      ),
    );

  if (!unread.length) return;

  await db.insert(adminNotificationReads).values(
    unread.map((row) => ({
      notificationId: row.id,
      userId,
    })),
  ).onConflictDoNothing();
}
