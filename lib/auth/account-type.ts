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

export function getStaffRole(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const o = user as Record<string, unknown>;
  const raw = o.staffRole ?? o.staff_role;
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}
