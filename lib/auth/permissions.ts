export const PERMISSIONS = {
  ADMIN_DASHBOARD: "admin.dashboard",
  ADMIN_SETTINGS: "admin.settings",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Staff roles stored in auth `user.staffRole`. Extend this map as you add roles. */
export const ROLE_PERMISSIONS: Record<
  string,
  readonly AppPermission[]
> = {
  owner: [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_SETTINGS],
  editor: [PERMISSIONS.ADMIN_DASHBOARD],
  writer: [PERMISSIONS.ADMIN_DASHBOARD],
};

export function roleHasPermission(
  role: string,
  permission: AppPermission,
): boolean {
  if (role === "owner") return true;
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes(permission);
}
