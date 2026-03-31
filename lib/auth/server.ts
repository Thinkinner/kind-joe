import { cookies, headers } from "next/headers";
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
  const headerList = await headers();
  const cookieStore = await cookies();
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => {
    reqHeaders.append(key, value);
  });
  const all = cookieStore.getAll();
  if (all.length > 0) {
    reqHeaders.set(
      "cookie",
      all.map((c) => `${c.name}=${c.value}`).join("; "),
    );
  }
  return auth.api.getSession({ headers: reqHeaders });
}

/** Reader login/register: skip when already signed in. */
export async function redirectIfAuthedFromReaderAuthPages() {
  const session = await getServerSession();
  if (!session?.user) return;
  const user = session.user as AuthAppUser;
  if (isStaffAccount(user)) {
    redirect("/admin");
  }
  redirect("/");
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

export type StaffApiDenial = "unauthenticated" | "forbidden";

/** For Route Handlers: staff session with a given permission. */
export async function resolveStaffApi(permission: AppPermission) {
  const session = await getServerSession();
  if (!session?.user) {
    return { ok: false as const, reason: "unauthenticated" as StaffApiDenial };
  }
  const user = session.user as AuthAppUser;
  if (!isStaffAccount(user)) {
    return { ok: false as const, reason: "forbidden" as StaffApiDenial };
  }
  if (!roleHasPermission(getStaffRole(user), permission)) {
    return { ok: false as const, reason: "forbidden" as StaffApiDenial };
  }
  return { ok: true as const, session, user };
}
