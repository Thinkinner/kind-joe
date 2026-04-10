import {
  parseStaffRolesFromDb,
  primaryStaffRole,
} from "@/lib/auth/staff-roles";

/**
 * Better Auth / DB may expose account type as camelCase or snake_case on session/user objects.
 */
export function getAccountType(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  const o = user as Record<string, unknown>;
  const raw = o.accountType ?? o.account_type;
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim().toLowerCase();
  return s.length ? s : undefined;
}

export function isStaffAccount(user: unknown): boolean {
  return getAccountType(user) === "staff";
}

/** All staff role slugs for this user (e.g. `["editor","writer"]`). */
export function getStaffRoles(user: unknown): string[] {
  if (!user || typeof user !== "object") return [];
  return parseStaffRolesFromDb(user as Parameters<typeof parseStaffRolesFromDb>[0]);
}

/**
 * Primary role for legacy checks (highest privilege in the list).
 * Prefer `getStaffRoles` when enforcing permissions.
 */
export function getStaffRole(user: unknown): string {
  return primaryStaffRole(getStaffRoles(user));
}
