/**
 * HttpOnly cookie set by POST /api/signals-lead after a successful GHL sync.
 * Kind Joe Watch no longer gates the UI on auth; `checkSignalsAccess` is always true.
 */
export const SIGNALS_ACCESS_COOKIE = "kj_signals_access";
export const SIGNALS_ACCESS_VALUE = "1";

export function hasSignalsAccess(
  cookieStore: { get(name: string): { value: string } | undefined },
): boolean {
  return cookieStore.get(SIGNALS_ACCESS_COOKIE)?.value === SIGNALS_ACCESS_VALUE;
}
