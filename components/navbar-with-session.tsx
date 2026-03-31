import { connection } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import Navbar from "@/components/navbar";

/** Serializable subset of session user for client navbar (avoids RSC / client boundary issues). */
function sessionUserForNav(user: unknown) {
  if (!user || typeof user !== "object") return null;
  const o = user as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    email: String(o.email ?? ""),
    name: String(o.name ?? ""),
    image: (o.image as string | null | undefined) ?? null,
    accountType: (o.accountType ?? o.account_type) as string | null | undefined,
    staffRole: (o.staffRole ?? o.staff_role) as string | null | undefined,
  };
}

export async function NavbarWithSession() {
  try {
    await connection();
  } catch {
    /* older Next without connection() */
  }
  const session = await getServerSession();
  const initialUser = session?.user
    ? sessionUserForNav(session.user)
    : null;
  return <Navbar initialSessionUser={initialUser} />;
}
