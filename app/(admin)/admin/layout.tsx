import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { AdminShell } from "@/components/domains/admin/admin-shell";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { getServerSession } from "@/lib/auth/server";
import { PERMISSIONS, userHasPermission } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const sessionUser = session?.user;
  const [dbUser] = sessionUser?.id
    ? await db
        .select({
          accountType: authUser.accountType,
          staffRole: authUser.staffRole,
          staffRoles: authUser.staffRoles,
          adminPageAccess: authUser.adminPageAccess,
        })
        .from(authUser)
        .where(eq(authUser.id, sessionUser.id))
        .limit(1)
    : [];
  const effectiveUser =
    sessionUser && dbUser ? { ...sessionUser, ...dbUser } : sessionUser;
  const navPermissions = {
    [PERMISSIONS.ADMIN_DASHBOARD]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_DASHBOARD,
    ),
    [PERMISSIONS.ADMIN_ARTICLES]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_ARTICLES,
    ),
    [PERMISSIONS.ADMIN_ANALYTICS]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_ANALYTICS,
    ),
    [PERMISSIONS.ADMIN_POSTS]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_POSTS,
    ),
    [PERMISSIONS.ADMIN_NEWSLETTER]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_NEWSLETTER,
    ),
    [PERMISSIONS.ADMIN_PREDICTIONS]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_PREDICTIONS,
    ),
    [PERMISSIONS.ADMIN_WEBHOOKS]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_WEBHOOKS,
    ),
    [PERMISSIONS.ADMIN_INGEST_DATA]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_INGEST_DATA,
    ),
    [PERMISSIONS.ADMIN_SECURITY]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_SECURITY,
    ),
    [PERMISSIONS.ADMIN_SUPERADMIN]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_SUPERADMIN,
    ),
    [PERMISSIONS.ADMIN_USERS]: userHasPermission(
      effectiveUser,
      PERMISSIONS.ADMIN_USERS,
    ),
  } as const;

  return (
    <AdminThemeProvider>
      <AdminShell navPermissions={navPermissions}>{children}</AdminShell>
    </AdminThemeProvider>
  );
}
