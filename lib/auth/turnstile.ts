import { logAuthEvent } from "@/lib/auth/log";

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

/** Paths where we require a valid Turnstile token when Turnstile is configured. */
export function requiresTurnstileForPath(authPath: string): boolean {
  const p = authPath.toLowerCase();
  return (
    p.includes("sign-in/email") ||
    p.includes("sign-up/email") ||
    p.includes("request-password-reset") ||
    p.includes("send-verification-email")
  );
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;

  if (!token?.trim()) {
    logAuthEvent("warn", "turnstile_missing_token", {});
    return false;
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      logAuthEvent("warn", "turnstile_verify_failed", {
        codes: data["error-codes"],
      });
    }
    return Boolean(data.success);
  } catch (e) {
    logAuthEvent("error", "turnstile_verify_error", {
      message: e instanceof Error ? e.message : "unknown",
    });
    return false;
  }
}
