import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export default async function AdminWebhooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_WEBHOOKS,
    "/admin/login",
    "not_found",
  );
  return children;
}
