import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_DASHBOARD,
    "/admin/login",
    "not_found",
  );
  return children;
}
