import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { articles, staffSlackLinks } from "@/db/schema";
import { account, user as authUser } from "@/db/auth-schema";
import { getStaffRoles } from "@/lib/auth/account-type";
import {
  sendAuthEmail,
  staffTemporaryPasswordEmailHtml,
  staffTemporaryPasswordEmailText,
} from "@/lib/email/resend";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  userHasPermission,
  type AppPermission,
} from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  formatStaffRolesForDisplay,
  hasSuperAdminRole,
  isSuperAdminRole,
  normalizeStaffRoles,
  parseStaffRolesFromDb,
  primaryStaffRole,
  STAFF_ROLE_PRECEDENCE,
} from "@/lib/auth/staff-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AssignableRoleSlugs = STAFF_ROLE_PRECEDENCE.filter(
  (role) => role !== "manager",
) as [string, ...string[]];
const RoleSlug = z.enum(AssignableRoleSlugs);
const PermissionSlug = z.enum(ALL_ADMIN_PERMISSIONS as [AppPermission, ...AppPermission[]]);

const PatchSchema = z
  .object({
    userId: z.string().min(1),
    email: z.string().trim().email().max(320).optional(),
    staffRoles: z.array(RoleSlug).min(1).max(5).optional(),
    adminPageAccess: z.union([z.array(PermissionSlug), z.null()]).optional(),
    aliasFullName: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
  })
  .refine(
    (d) =>
      d.email !== undefined ||
      d.staffRoles !== undefined ||
      d.adminPageAccess !== undefined ||
      d.aliasFullName !== undefined,
    { message: "Provide email, staffRoles, adminPageAccess, and/or aliasFullName." },
  );

const DeleteSchema = z.object({
  userId: z.string().min(1),
});

const TemporaryPasswordSchema = z.object({
  userId: z.string().min(1),
});

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(14);
  let out = "KJ-";
  for (const b of bytes) {
    out += alphabet[b % alphabet.length];
  }
  return out;
}

export async function GET(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const [viewerRow] = await db
    .select({
      staffRoles: authUser.staffRoles,
      staffRole: authUser.staffRole,
    })
    .from(authUser)
    .where(eq(authUser.id, staff.user.id))
    .limit(1);

  const viewerRoles = parseStaffRolesFromDb(viewerRow ?? {});
  const viewerIsSuperAdmin = hasSuperAdminRole(viewerRoles);
  const viewerIsOwner = viewerRoles.includes("owner");
  const viewerIsAdmin = viewerRoles.includes("admin");

  const rows = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      aliasFullName: authUser.aliasFullName,
      email: authUser.email,
      accountType: authUser.accountType,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      adminPageAccess: authUser.adminPageAccess,
      directoryRoleMask: authUser.directoryRoleMask,
      image: authUser.image,
      createdAt: authUser.createdAt,
      slackUserId: staffSlackLinks.slackUserId,
    })
    .from(authUser)
    .leftJoin(staffSlackLinks, eq(staffSlackLinks.userId, authUser.id))
    .orderBy(
      sql`CASE WHEN coalesce(${authUser.accountType}, 'reader') = 'staff' THEN 0 ELSE 1 END`,
      authUser.email,
    )
    .limit(limit)
    .offset(offset);

  const out = rows.map((row) => {
    const real = parseStaffRolesFromDb(row);
    const isSelf = row.id === staff.user.id;
    const targetHasSuperAdmin = hasSuperAdminRole(real);
    const targetHasOwner = real.includes("owner");
    const mask = row.directoryRoleMask?.trim();
    const useMask = Boolean(mask) && !isSelf && !viewerIsSuperAdmin && !viewerIsOwner;

    const displayedRoles = formatStaffRolesForDisplay(real).map((role) =>
      role === "superadmin" && !viewerIsSuperAdmin ? "admin" : role,
    );
    const rolesDisplay = useMask ? mask! : displayedRoles.join(", ") || "—";

    const callerSuperAdmin = viewerIsSuperAdmin;
    const callerOwner = viewerIsOwner;
    const callerAdmin = viewerRoles.includes("admin");

    const targetIsStaff = (row.accountType ?? "reader") === "staff";
    let canEditRoles = false;
    if (targetIsStaff) {
      canEditRoles = true;
      if (targetHasSuperAdmin && !callerSuperAdmin) canEditRoles = false;
      if (targetHasOwner && !callerSuperAdmin && !callerOwner) canEditRoles = false;
    } else {
      // Readers: superadmin/owner/admin can promote and assign roles.
      canEditRoles = callerSuperAdmin || callerOwner || callerAdmin;
    }

    const sendRealRoles =
      isSelf || viewerIsSuperAdmin || viewerIsOwner || viewerIsAdmin || (!useMask && canEditRoles);
    const normalizedPageAccess = Array.isArray(row.adminPageAccess)
      ? row.adminPageAccess.filter((p): p is AppPermission =>
          (ALL_ADMIN_PERMISSIONS as string[]).includes(String(p)),
        )
      : null;
    const effectivePageAccess = ALL_ADMIN_PERMISSIONS.filter((perm) =>
      userHasPermission(
        {
          accountType: row.accountType,
          staffRole: row.staffRole,
          staffRoles: real,
          adminPageAccess: normalizedPageAccess,
        },
        perm,
      ),
    );
    const visibleRoles = sendRealRoles
      ? real.map((role) =>
          role === "superadmin" && !viewerIsSuperAdmin ? "admin" : role,
        )
      : null;

    return {
      id: row.id,
      name: row.name,
      aliasFullName: row.aliasFullName,
      email: row.email,
      accountType: row.accountType,
      image: row.image,
      createdAt: row.createdAt?.toISOString?.() ?? null,
      staffRole: row.staffRole,
      staffRoles: visibleRoles,
      rolesDisplay,
      directoryMasked: useMask,
      directoryRoleMask: isSelf ? row.directoryRoleMask : undefined,
      isSelf,
      showRealRoles: sendRealRoles,
      slackUserId: row.slackUserId ?? null,
      canEditRoles:
        canEditRoles &&
        !(isSelf && callerSuperAdmin) &&
        (callerSuperAdmin || callerOwner || (callerAdmin && !targetHasSuperAdmin)) &&
        sendRealRoles,
      canEditPageAccess: callerSuperAdmin && !isSelf,
      adminPageAccess: callerSuperAdmin ? normalizedPageAccess : null,
      effectivePageAccess,
    };
  });

  return NextResponse.json(out);
}

export async function PATCH(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const caller = staff.user;
  const callerRoles = getStaffRoles(caller);
  const callerSuperAdmin = hasSuperAdminRole(callerRoles);
  const callerOwner = callerRoles.includes("owner");
  const callerAdmin = callerRoles.includes("admin");

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { userId, email: nextEmail, staffRoles: nextRoles, adminPageAccess, aliasFullName } =
    parsed.data;
  if (adminPageAccess !== undefined && !callerSuperAdmin) {
    return NextResponse.json(
      { error: "Only superadmin can set page access." },
      { status: 403 },
    );
  }

  const [targetRow] = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      accountType: authUser.accountType,
      aliasFullName: authUser.aliasFullName,
    })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  if (!targetRow) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const targetRoles = parseStaffRolesFromDb(targetRow);
  const targetHasSuperAdmin = hasSuperAdminRole(targetRoles);
  const targetHasOwner = targetRoles.includes("owner");

  const setPayload: Partial<typeof authUser.$inferInsert> = {};

  if (nextEmail !== undefined) {
    const normalizedEmail = nextEmail.trim().toLowerCase();
    const currentEmail = targetRow.email.trim().toLowerCase();

    if (!callerSuperAdmin && !callerOwner && !callerAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (targetHasSuperAdmin && !callerSuperAdmin) {
      return NextResponse.json(
        { error: "Only superadmin can change a superadmin account." },
        { status: 403 },
      );
    }
    if (!callerSuperAdmin && !callerOwner && callerAdmin && targetHasOwner) {
      return NextResponse.json(
        { error: "Only owner can change an owner account." },
        { status: 403 },
      );
    }

    if (normalizedEmail !== currentEmail) {
      const [existing] = await db
        .select({ id: authUser.id })
        .from(authUser)
        .where(eq(authUser.email, normalizedEmail))
        .limit(1);
      if (existing && existing.id !== userId) {
        return NextResponse.json(
          { error: "That email is already used by another account." },
          { status: 409 },
        );
      }
      setPayload.email = normalizedEmail;
      setPayload.emailVerified = true;
    }
  }

  if (nextRoles !== undefined) {
    if (userId === caller.id && callerSuperAdmin) {
      return NextResponse.json(
        { error: "Superadmin cannot change their own roles." },
        { status: 400 },
      );
    }

    if (!callerSuperAdmin) {
      if (nextRoles.some((r) => isSuperAdminRole(r))) {
        return NextResponse.json(
          { error: "Only superadmin can assign superadmin." },
          { status: 403 },
        );
      }
      if (targetHasSuperAdmin) {
        return NextResponse.json(
          { error: "Only superadmin can change a superadmin account." },
          { status: 403 },
        );
      }
    }

    if (!callerSuperAdmin && !callerOwner && !callerAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const norm = normalizeStaffRoles(nextRoles);
    const nextHasOwner = norm.includes("owner");
    if (!callerSuperAdmin && !callerOwner && nextHasOwner) {
      return NextResponse.json(
        { error: "Only owner can assign owner role." },
        { status: 403 },
      );
    }
    if (!callerSuperAdmin && !callerOwner && callerAdmin && targetHasOwner) {
      return NextResponse.json(
        { error: "Only owner can change an owner account." },
        { status: 403 },
      );
    }
    setPayload.staffRoles = norm;
    setPayload.staffRole = primaryStaffRole(norm);
    setPayload.accountType = "staff";
  }

  if (adminPageAccess !== undefined) {
    setPayload.adminPageAccess =
      adminPageAccess === null ? null : [...new Set(adminPageAccess)];
  }

  if (aliasFullName !== undefined) {
    setPayload.aliasFullName = aliasFullName === null ? null : aliasFullName.trim();
  }

  if (Object.keys(setPayload).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const [updated] = await db
    .update(authUser)
    .set(setPayload)
    .where(eq(authUser.id, userId))
    .returning({
      id: authUser.id,
      email: authUser.email,
      aliasFullName: authUser.aliasFullName,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      accountType: authUser.accountType,
      adminPageAccess: authUser.adminPageAccess,
      directoryRoleMask: authUser.directoryRoleMask,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const normalizedUpdatedAlias = (updated.aliasFullName ?? "").trim();
  const aliasSyncRequested = aliasFullName !== undefined;
  if (aliasSyncRequested) {
    if (normalizedUpdatedAlias.length > 0) {
      await db
        .update(articles)
        .set({
          seo: sql`
            jsonb_set(
              jsonb_set(
                CASE
                  WHEN ${articles.seo} IS NULL OR jsonb_typeof(${articles.seo}) <> 'object' THEN '{}'::jsonb
                  ELSE ${articles.seo}
                END,
                '{authorName}',
                to_jsonb(${normalizedUpdatedAlias}::text),
                true
              ),
              '{bylineSource}',
              to_jsonb('alias'::text),
              true
            )
          `,
        })
        .where(eq(articles.authorId, userId));
    } else {
      await db
        .update(articles)
        .set({
          seo: sql`
            CASE
              WHEN ${articles.seo} IS NULL THEN NULL
              ELSE (${articles.seo} - 'authorName' - 'bylineSource')
            END
          `,
        })
        .where(eq(articles.authorId, userId));
    }
  }

  return NextResponse.json(updated);
}

export async function POST(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const caller = staff.user;
  const callerRoles = getStaffRoles(caller);
  const callerSuperAdmin = hasSuperAdminRole(callerRoles);
  const callerOwner = callerRoles.includes("owner");
  const callerAdmin = callerRoles.includes("admin");

  const parsed = TemporaryPasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (!callerSuperAdmin && !callerOwner && !callerAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = parsed.data;
  if (userId === caller.id) {
    return NextResponse.json(
      { error: "Use account settings to change your own password." },
      { status: 400 },
    );
  }

  const [target] = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      accountType: authUser.accountType,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
    })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if ((target.accountType ?? "reader") !== "staff") {
    return NextResponse.json(
      { error: "Temporary password is only available for staff accounts." },
      { status: 400 },
    );
  }

  const targetRoles = parseStaffRolesFromDb(target);
  const targetHasSuperAdmin = hasSuperAdminRole(targetRoles);
  const targetHasOwner = targetRoles.includes("owner");
  if (!callerSuperAdmin && targetHasSuperAdmin) {
    return NextResponse.json(
      { error: "Only superadmin can reset a superadmin password." },
      { status: 403 },
    );
  }
  if (!callerSuperAdmin && !callerOwner && callerAdmin && targetHasOwner) {
    return NextResponse.json(
      { error: "Only owner can reset an owner password." },
      { status: 403 },
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(temporaryPassword);
  const now = new Date();

  const [existingCredentialAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, target.id), eq(account.providerId, "credential")),
    )
    .limit(1);

  await db.transaction(async (tx) => {
    if (existingCredentialAccount) {
      await tx
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: now,
        })
        .where(eq(account.id, existingCredentialAccount.id));
    } else {
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: target.id,
        providerId: "credential",
        userId: target.id,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(authUser)
      .set({ forcePasswordChange: true })
      .where(eq(authUser.id, target.id));
  });

  let emailSent = true;
  let emailErrorMessage = "";
  try {
    await sendAuthEmail({
      to: target.email,
      subject: "Your Kind Joe temporary password",
      html: staffTemporaryPasswordEmailHtml(target.name ?? "", temporaryPassword),
      text: staffTemporaryPasswordEmailText(target.name ?? "", temporaryPassword),
    });
  } catch (err) {
    emailSent = false;
    emailErrorMessage = err instanceof Error ? err.message : "Failed to send email";
  }

  return NextResponse.json({
    ok: true,
    email: target.email,
    temporaryPassword,
    emailSent,
    ...(emailSent ? {} : { emailError: emailErrorMessage }),
  });
}

export async function DELETE(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const caller = staff.user;
  const callerRoles = getStaffRoles(caller);
  const callerSuperAdmin = hasSuperAdminRole(callerRoles);
  const callerOwner = callerRoles.includes("owner");
  const callerAdmin = callerRoles.includes("admin");

  const parsed = DeleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (!callerSuperAdmin && !callerOwner && !callerAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = parsed.data;
  if (userId === caller.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself." },
      { status: 400 },
    );
  }

  const [targetRow] = await db
    .select({
      id: authUser.id,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      accountType: authUser.accountType,
    })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  if (!targetRow) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const targetRoles = parseStaffRolesFromDb(targetRow);
  const targetHasSuperAdmin = hasSuperAdminRole(targetRoles);
  const targetHasOwner = targetRoles.includes("owner");

  if (!callerSuperAdmin && targetHasSuperAdmin) {
    return NextResponse.json(
      { error: "Only superadmin can remove a superadmin member." },
      { status: 403 },
    );
  }
  if (!callerSuperAdmin && !callerOwner && callerAdmin && targetHasOwner) {
    return NextResponse.json(
      { error: "Only owner can remove an owner member." },
      { status: 403 },
    );
  }

  const [updated] = await db
    .update(authUser)
    .set({
      accountType: "reader",
      staffRole: null,
      staffRoles: [],
      adminPageAccess: null,
      directoryRoleMask: null,
    })
    .where(eq(authUser.id, userId))
    .returning({
      id: authUser.id,
      email: authUser.email,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    email: updated.email,
  });
}
