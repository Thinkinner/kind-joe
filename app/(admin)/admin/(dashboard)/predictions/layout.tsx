import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export default async function AdminPredictionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_PREDICTIONS,
    "/admin/login",
    "not_found",
  );
  return children;
}
