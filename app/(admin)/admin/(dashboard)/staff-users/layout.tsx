import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export default async function StaffUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_USERS,
    "/admin/login",
    "not_found",
  );
  return children;
}
