import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export default async function AdminIngestDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_INGEST_DATA,
    "/admin/login",
    "not_found",
  );
  return children;
}
