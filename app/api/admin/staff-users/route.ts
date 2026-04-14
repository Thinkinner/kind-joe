import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { getStaffRoles } from "@/lib/auth/account-type";
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

const RoleSlug = z.enum(STAFF_ROLE_PRECEDENCE);
const PermissionSlug = z.enum(ALL_ADMIN_PERMISSIONS as [AppPermission, ...AppPermission[]]);

const PatchSchema = z
  .object({
    userId: z.string().min(1),
    staffRoles: z.array(RoleSlug).min(1).max(5).optional(),
    directoryRoleMask: z.union([z.string().max(240), z.null()]).optional(),
    adminPageAccess: z.union([z.array(PermissionSlug), z.null()]).optional(),
  })
  .refine(
    (d) =>
      d.staffRoles !== undefined ||
      d.directoryRoleMask !== undefined ||
      d.adminPageAccess !== undefined,
    { message: "Provide staffRoles, directoryRoleMask and/or adminPageAccess." },
  );

const DeleteSchema = z.object({
  userId: z.string().min(1),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

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
      email: authUser.email,
      accountType: authUser.accountType,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      adminPageAccess: authUser.adminPageAccess,
      directoryRoleMask: authUser.directoryRoleMask,
      image: authUser.image,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(authUser.email);

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
      canEditRoles:
        canEditRoles &&
        !(isSelf && callerSuperAdmin) &&
        (callerSuperAdmin || callerOwner || (callerAdmin && !targetHasSuperAdmin)) &&
        sendRealRoles,
      canEditPageAccess: callerSuperAdmin && !isSelf,
      adminPageAccess: callerSuperAdmin ? normalizedPageAccess : null,
      effectivePageAccess,
      canEditDirectoryMask: isSelf && (row.accountType ?? "reader") === "staff",
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

  const { userId, staffRoles: nextRoles, directoryRoleMask, adminPageAccess } =
    parsed.data;

  if (directoryRoleMask !== undefined && userId !== caller.id) {
    return NextResponse.json(
      { error: "Only you can change your directory label." },
      { status: 403 },
    );
  }
  if (adminPageAccess !== undefined && !callerSuperAdmin) {
    return NextResponse.json(
      { error: "Only superadmin can set page access." },
      { status: 403 },
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

  const setPayload: Partial<typeof authUser.$inferInsert> = {};

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

  if (directoryRoleMask !== undefined) {
    setPayload.directoryRoleMask =
      directoryRoleMask === null || directoryRoleMask.trim() === ""
        ? null
        : directoryRoleMask.trim();
  }
  if (adminPageAccess !== undefined) {
    setPayload.adminPageAccess =
      adminPageAccess === null ? null : [...new Set(adminPageAccess)];
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
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      accountType: authUser.accountType,
      adminPageAccess: authUser.adminPageAccess,
      directoryRoleMask: authUser.directoryRoleMask,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
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
