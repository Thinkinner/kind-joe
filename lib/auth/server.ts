import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { isStaffAccount } from "@/lib/auth/account-type";
import { logAuthEvent } from "@/lib/auth/log";
import {
  type AppPermission,
  userHasPermission,
} from "@/lib/auth/permissions";

export type AuthAppUser = {
  id: string;
  email: string;
  name: string;
  aliasFullName?: string | null;
  image?: string | null;
  username?: string | null;
  accountType?: string | null;
  staffRole?: string | null;
  staffRoles?: string[] | null;
  adminPageAccess?: string[] | null;
};

let warnedSessionQueryFailure = false;

function normalizeNextPath(nextPath: string | undefined): string {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/")) return "/";
  if (nextPath.startsWith("//")) return "/";
  return nextPath;
}

function readerLoginRedirectPath(loginPath: string, nextPath: string): string {
  const base = loginPath.startsWith("/") ? loginPath : "/login";
  const qp = new URLSearchParams();
  qp.set("reason", "session");
  qp.set("next", normalizeNextPath(nextPath));
  return `${base}?${qp.toString()}`;
}

async function hydrateAuthUserFromDb(user: AuthAppUser): Promise<AuthAppUser> {
  if (!user?.id) return user;
  const [row] = await db
    .select({
      accountType: authUser.accountType,
      aliasFullName: authUser.aliasFullName,
      staffRole: authUser.staffRole,
      staffRoles: authUser.staffRoles,
      adminPageAccess: authUser.adminPageAccess,
    })
    .from(authUser)
    .where(eq(authUser.id, user.id))
    .limit(1);
  if (!row) return user;
  return {
    ...user,
    accountType: row.accountType ?? user.accountType,
    aliasFullName:
      typeof row.aliasFullName === "string"
        ? row.aliasFullName
        : (user.aliasFullName ?? null),
    staffRole: row.staffRole ?? user.staffRole,
    staffRoles: row.staffRoles ?? user.staffRoles,
    adminPageAccess:
      row.adminPageAccess === undefined
        ? (user.adminPageAccess ?? null)
        : row.adminPageAccess,
  };
}

export async function getServerSession() {
  const headerList = await headers();
  const cookieStore = await cookies();
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => {
    if (key.toLowerCase() === "cookie") return;
    reqHeaders.set(key, value);
  });
  const all = cookieStore.getAll();
  if (all.length > 0) {
    reqHeaders.set(
      "cookie",
      all.map((c) => `${c.name}=${c.value}`).join("; "),
    );
  } else {
    const incomingCookie = headerList.get("cookie");
    if (incomingCookie?.trim()) {
      reqHeaders.set("cookie", incomingCookie);
    }
  }
  try {
    return await auth.api.getSession({ headers: reqHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("Failed query") &&
      (message.includes(`from "session"`) || message.includes("where \"session\""))
    ) {
      if (!warnedSessionQueryFailure) {
        warnedSessionQueryFailure = true;
        logAuthEvent("warn", "auth_get_server_session_query_failed", {
          reason: "session_table_mismatch_or_invalid_token",
        });
      }
      return null;
    }
    logAuthEvent("warn", "auth_get_server_session_failed", {
      reason: "non_query_error",
    });
    return null;
  }
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
  onForbidden: "redirect" | "not_found" = "redirect",
) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(loginPath);
  }
  const user = session.user as AuthAppUser;
  const hydratedUser = await hydrateAuthUserFromDb(user);
  if (!isStaffAccount(hydratedUser)) {
    redirect("/login?reason=staff_only");
  }
  if (!userHasPermission(hydratedUser, permission)) {
    if (onForbidden === "not_found") {
      notFound();
    }
    redirect("/admin?error=forbidden");
  }
  return { session, user: hydratedUser };
}

export async function requireReaderSession(
  loginPath = "/login",
  nextPath = "/",
) {
  const session = await getServerSession();
  if (!session?.user) {
    const headerList = await headers();
    const cookieStore = await cookies();
    logAuthEvent("warn", "reader_session_missing", {
      host: headerList.get("host") ?? "",
      hasCookies: cookieStore.getAll().length > 0,
      nextPath: normalizeNextPath(nextPath),
    });
    redirect(readerLoginRedirectPath(loginPath, nextPath));
  }
  const user = session.user as AuthAppUser;
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
  const hydratedUser = await hydrateAuthUserFromDb(user);
  if (!isStaffAccount(hydratedUser)) {
    return { ok: false as const, reason: "forbidden" as StaffApiDenial };
  }
  if (!userHasPermission(hydratedUser, permission)) {
    return { ok: false as const, reason: "forbidden" as StaffApiDenial };
  }
  return { ok: true as const, session, user: hydratedUser };
}
