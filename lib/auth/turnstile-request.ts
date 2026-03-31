/**
 * One-shot Turnstile token for the next Better Auth HTTP request.
 * Set immediately before each authClient call that hits a Turnstile-protected path.
 */
let pendingToken: string | null = null;

export function setAuthTurnstileToken(token: string | null): void {
  pendingToken = token?.trim() || null;
}

export function takeAuthTurnstileTokenForRequest(): string | null {
  const t = pendingToken;
  pendingToken = null;
  return t;
}
