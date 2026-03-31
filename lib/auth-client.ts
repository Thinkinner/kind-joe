"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { takeAuthTurnstileTokenForRequest } from "@/lib/auth/turnstile-request";

function clientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: clientBaseURL(),
  plugins: [twoFactorClient()],
  fetchOptions: {
    onRequest(context) {
      const t = takeAuthTurnstileTokenForRequest();
      if (!t) return context;
      const headers = new Headers(
        context.headers as HeadersInit | undefined,
      );
      headers.set("x-turnstile-token", t);
      return { ...context, headers };
    },
  },
});
