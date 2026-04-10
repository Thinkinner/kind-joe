import { getStaffRoles } from "@/lib/auth/account-type";
import { isSuperAdminRole } from "@/lib/auth/staff-roles";

export const PERMISSIONS = {
  ADMIN_DASHBOARD: "admin.dashboard",
  ADMIN_ARTICLES: "admin.articles",
  ADMIN_ANALYTICS: "admin.analytics",
  ADMIN_VISITOR_JOURNEYS: "admin.visitor_journeys",
  ADMIN_POSTS: "admin.posts",
  ADMIN_NEWSLETTER: "admin.newsletter",
  ADMIN_PREDICTIONS: "admin.predictions",
  ADMIN_WEBHOOKS: "admin.webhooks",
  ADMIN_INGEST_DATA: "admin.ingest_data",
  ADMIN_SECURITY: "admin.security",
  /** Backward-compatible alias. */
  ADMIN_SETTINGS: "admin.security",
  /** Staff directory & roles — gated via ROLE_PERMISSIONS + route rules. */
  ADMIN_USERS: "admin.users",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_ADMIN_PERMISSIONS = Array.from(
  new Set(Object.values(PERMISSIONS)),
) as AppPermission[];

/** Staff roles stored in auth `user.staffRole`. Extend this map as you add roles. */
export const ROLE_PERMISSIONS: Record<
  string,
  readonly AppPermission[]
> = {
  /** Highest role. Can do everything, including superadmin-only operations. */
  superadmin: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
    PERMISSIONS.ADMIN_POSTS,
    PERMISSIONS.ADMIN_NEWSLETTER,
    PERMISSIONS.ADMIN_PREDICTIONS,
    PERMISSIONS.ADMIN_WEBHOOKS,
    PERMISSIONS.ADMIN_INGEST_DATA,
    PERMISSIONS.ADMIN_SECURITY,
    PERMISSIONS.ADMIN_USERS,
  ],
  owner: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
    PERMISSIONS.ADMIN_POSTS,
    PERMISSIONS.ADMIN_NEWSLETTER,
    PERMISSIONS.ADMIN_USERS,
  ],
  /** Full admin except superadmin-only role operations (enforced in API). */
  admin: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
    PERMISSIONS.ADMIN_POSTS,
    PERMISSIONS.ADMIN_NEWSLETTER,
    PERMISSIONS.ADMIN_USERS,
  ],
  /** Ops role with broad content/admin access but no user management. */
  manager: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
    PERMISSIONS.ADMIN_POSTS,
    PERMISSIONS.ADMIN_NEWSLETTER,
    PERMISSIONS.ADMIN_PREDICTIONS,
    PERMISSIONS.ADMIN_WEBHOOKS,
    PERMISSIONS.ADMIN_INGEST_DATA,
    PERMISSIONS.ADMIN_SECURITY,
  ],
  editor: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_NEWSLETTER,
  ],
  writer: [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_ARTICLES],
};

export function roleHasPermission(
  role: string,
  permission: AppPermission,
): boolean {
  if (isSuperAdminRole(role)) return true;
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes(permission);
}

function normalizeUserPageAccess(user: unknown): AppPermission[] | null {
  if (!user || typeof user !== "object") return null;
  const obj = user as Record<string, unknown>;
  const raw = obj.adminPageAccess ?? obj.admin_page_access;
  if (!Array.isArray(raw)) return null;
  const next = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s): s is AppPermission =>
      (ALL_ADMIN_PERMISSIONS as string[]).includes(s),
    );
  return Array.from(new Set(next));
}

/** True if any of the user’s roles grants the permission (`owner` always wins). */
export function userHasPermission(
  user: unknown,
  permission: AppPermission,
): boolean {
  const roles = getStaffRoles(user);
  if (roles.some((r) => isSuperAdminRole(r))) return true;
  const pageAccess = normalizeUserPageAccess(user);
  if (pageAccess) return pageAccess.includes(permission);
  return roles.some((r) => roleHasPermission(r, permission));
}
