import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStaffRole, isStaffAccount } from "@/lib/auth/account-type";
import {
  type AppPermission,
  roleHasPermission,
} from "@/lib/auth/permissions";

export type AuthAppUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  accountType?: string | null;
  staffRole?: string | null;
};

export async function getServerSession() {
  const h = await headers();
  return auth.api.getSession({ headers: h });
}

export async function requireStaffPermission(
  permission: AppPermission,
  loginPath = "/admin/login",
) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(loginPath);
  }
  const user = session.user as AuthAppUser;
  if (!isStaffAccount(user)) {
    redirect("/login?reason=staff_only");
  }
  if (!roleHasPermission(getStaffRole(user), permission)) {
    redirect("/admin?error=forbidden");
  }
  return { session, user };
}

export async function requireReaderSession(loginPath = "/login") {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(loginPath);
  }
  const user = session.user as AuthAppUser;
  if (isStaffAccount(user)) {
    redirect("/admin");
  }
  return { session, user };
}
