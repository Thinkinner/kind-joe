import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { staffInvitation } from "@/db/auth-schema";
import { getStaffRoles } from "@/lib/auth/account-type";
import {
  generateInviteToken,
  InvitableStaffRoleSchema,
  staffRoleLabel,
} from "@/lib/auth/staff-invite";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  type AppPermission,
} from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { hasSuperAdminRole } from "@/lib/auth/staff-roles";
import {
  getTransactionalFrom,
  sendAuthEmail,
  staffInviteEmailHtml,
  staffInviteEmailText,
} from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PermissionSlug = z.enum(
  ALL_ADMIN_PERMISSIONS as [AppPermission, ...AppPermission[]],
);

const PostSchema = z.object({
  email: z.string().email(),
  staffRole: InvitableStaffRoleSchema,
  adminPageAccess: z.array(PermissionSlug).optional().nullable(),
});

function publicSiteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/** Owner/admin: list pending invites */
export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const rows = await db
    .select({
      id: staffInvitation.id,
      email: staffInvitation.email,
      staffRole: staffInvitation.staffRole,
      adminPageAccess: staffInvitation.adminPageAccess,
      expiresAt: staffInvitation.expiresAt,
      createdAt: staffInvitation.createdAt,
    })
    .from(staffInvitation)
    .where(isNull(staffInvitation.acceptedAt))
    .orderBy(desc(staffInvitation.createdAt))
    .limit(100);

  return NextResponse.json({
    invitations: rows.map((r) => ({
      ...r,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/** Owner/admin: send invite email */
export async function POST(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const parsed = PostSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const staffRole = parsed.data.staffRole;
  const invitePageAccess = parsed.data.adminPageAccess;
  const canSetPageAccess = hasSuperAdminRole(getStaffRoles(staff.user));
  if (invitePageAccess !== undefined && !canSetPageAccess) {
    return NextResponse.json(
      { error: "Only superadmin can set invite page access." },
      { status: 403 },
    );
  }
  const normalizedInvitePageAccess: AppPermission[] | null | undefined =
    invitePageAccess === undefined
      ? undefined
      : invitePageAccess === null
        ? null
        : Array.from(new Set(invitePageAccess));
  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .delete(staffInvitation)
    .where(
      and(
        eq(staffInvitation.email, email),
        isNull(staffInvitation.acceptedAt),
      ),
    );

  await db.insert(staffInvitation).values({
    id: randomUUID(),
    email,
    staffRole,
    adminPageAccess: normalizedInvitePageAccess ?? null,
    tokenHash: hash,
    expiresAt,
    createdByUserId: staff.user.id,
  });

  const base = publicSiteBase();
  const acceptUrl = `${base}/join-team?token=${encodeURIComponent(raw)}`;
  const label = staffRoleLabel(staffRole);

  void sendAuthEmail({
    to: email,
    subject: `You’re invited to Kind Joe (${label})`,
    html: staffInviteEmailHtml(label, acceptUrl),
    text: staffInviteEmailText(label, acceptUrl),
  }).catch((err: unknown) => {
    console.error("staff_invite_email_failed", err);
  });

  return NextResponse.json({
    ok: true,
    message: `Invitation email queued for ${email}.`,
    from: getTransactionalFrom(),
  });
}
