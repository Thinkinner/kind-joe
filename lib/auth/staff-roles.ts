/** Canonical order for picking a single “primary” role (legacy `staff_role` column). */
export const STAFF_ROLE_PRECEDENCE = [
  "superadmin",
  "owner",
  "admin",
  "manager",
  "editor",
  "writer",
] as const;

export type StaffRoleSlug = (typeof STAFF_ROLE_PRECEDENCE)[number];

export const STAFF_ROLE_SET = new Set<string>(STAFF_ROLE_PRECEDENCE);
export const SUPERADMIN_ROLES = ["superadmin"] as const;
const SUPERADMIN_SET = new Set<string>(SUPERADMIN_ROLES);

export function primaryStaffRole(roles: string[]): string {
  if (!roles.length) return "";
  for (const r of STAFF_ROLE_PRECEDENCE) {
    if (roles.includes(r)) return r;
  }
  return roles[0];
}

/** Dedupe, keep order, only known slugs. */
export function normalizeStaffRoles(input: string[]): string[] {
  const out: string[] = [];
  for (const r of input) {
    const s = String(r).trim().toLowerCase();
    if (!STAFF_ROLE_SET.has(s)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

export function isSuperAdminRole(role: string): boolean {
  return SUPERADMIN_SET.has(String(role).trim().toLowerCase());
}

export function hasSuperAdminRole(roles: string[]): boolean {
  return roles.some((r) => isSuperAdminRole(r));
}

/** Keep UI labels 1:1 with stored role slugs. */
export function formatStaffRolesForDisplay(roles: string[]): string[] {
  const out: string[] = [];
  for (const role of roles) {
    const label = String(role).trim().toLowerCase();
    if (!label) continue;
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

export function parseStaffRolesFromDb(row: {
  staffRoles?: unknown;
  staffRole?: string | null;
}): string[] {
  const raw = row.staffRoles;
  if (Array.isArray(raw)) {
    const fromJson = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => STAFF_ROLE_SET.has(s));
    if (fromJson.length) return normalizeStaffRoles(fromJson);
  }
  const legacy = row.staffRole?.trim();
  if (legacy && STAFF_ROLE_SET.has(legacy.toLowerCase())) {
    return [legacy.toLowerCase()];
  }
  return [];
}
