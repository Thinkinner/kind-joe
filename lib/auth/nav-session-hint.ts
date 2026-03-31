/** One-shot UI bridge after sign-in: full navigation can run before cookies appear in RSC/fetch. */

export const NAV_SESSION_HINT_KEY = "kj_nav_session_hint";
const MAX_AGE_MS = 120_000;

export type NavSessionHintUser = {
  id: string;
  email: string;
  name: string;
  accountType?: string | null;
  staffRole?: string | null;
};

export function stashNavSessionHint(user: unknown): void {
  if (typeof window === "undefined") return;
  if (!user || typeof user !== "object") return;
  const u = user as Record<string, unknown>;
  const id = String(u.id ?? "");
  if (!id) return;
  try {
    const payload = {
      v: 1 as const,
      at: Date.now(),
      id,
      email: String(u.email ?? ""),
      name: String(u.name ?? ""),
      accountType: (u.accountType ?? u.account_type) as string | null | undefined,
      staffRole: (u.staffRole ?? u.staff_role) as string | null | undefined,
    };
    sessionStorage.setItem(NAV_SESSION_HINT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekNavSessionHint(): NavSessionHintUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(NAV_SESSION_HINT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as {
      v?: number;
      at?: number;
      id?: string;
      email?: string;
      name?: string;
      accountType?: string | null;
      staffRole?: string | null;
    };
    if (o.v !== 1 || typeof o.at !== "number") return null;
    if (Date.now() - o.at > MAX_AGE_MS) {
      sessionStorage.removeItem(NAV_SESSION_HINT_KEY);
      return null;
    }
    if (!o.id) return null;
    return {
      id: o.id,
      email: o.email ?? "",
      name: o.name ?? "",
      accountType: o.accountType ?? null,
      staffRole: o.staffRole ?? null,
    };
  } catch {
    return null;
  }
}

export function clearNavSessionHint(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(NAV_SESSION_HINT_KEY);
  } catch {
    /* ignore */
  }
}
