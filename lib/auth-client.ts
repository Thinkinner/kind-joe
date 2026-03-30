"use client";

import { createAuthClient } from "better-auth/react";

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
});
