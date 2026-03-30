import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";

function getTrustedOrigins(): string[] {
  const origins = new Set<string>();
  const main = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const admin = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "");
  if (main) origins.add(main);
  if (publicSite) origins.add(publicSite);
  if (admin) origins.add(admin);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
  }
  return [...origins];
}

function getAuthSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-better-auth-secret-min-32-chars!!";
  }
  // `next build` sets NEXT_PHASE=*-build* but NODE_ENV=production; allow compile without a real secret.
  if (process.env.NEXT_PHASE?.includes("build")) {
    return "build-time-placeholder-better-auth-secret-32chars!!";
  }
  throw new Error(
    "BETTER_AUTH_SECRET must be set (min 32 characters) in production.",
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
  },
  secret: getAuthSecret(),
  baseURL:
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
  trustedOrigins: getTrustedOrigins(),
  user: {
    additionalFields: {
      accountType: {
        type: "string",
        required: false,
        defaultValue: "reader",
        input: false,
      },
      staffRole: {
        type: "string",
        required: false,
        defaultValue: "",
        input: false,
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled:
        process.env.BETTER_AUTH_COOKIE_DOMAIN != null &&
        process.env.BETTER_AUTH_COOKIE_DOMAIN.length > 0,
      domain: process.env.BETTER_AUTH_COOKIE_DOMAIN,
    },
  },
});
