import { APIError } from "@better-auth/core/error";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import {
  authDeleteAccountHtml,
  authDeleteAccountText,
  authPasswordResetHtml,
  authVerifyEmailHtml,
  authVerifyEmailText,
  sendAuthEmail,
} from "@/lib/email/resend";
import { ensureReaderContactInGhl } from "@/lib/ghl/reader-sync";
import { logAuthEvent } from "@/lib/auth/log";

/** Fire-and-forget (Better Auth: avoid awaiting email to reduce timing leaks). */
function queueAuthEmail(
  payload: Parameters<typeof sendAuthEmail>[0],
): void {
  void sendAuthEmail(payload).catch((err: unknown) => {
    logAuthEvent("error", "auth_email_send_failed", {
      toDomain: payload.to.split("@")[1] ?? "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

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

/** Session + session cookie max-age (seconds). */
const SESSION_EXPIRES_IN_SEC = 60 * 60 * 24 * 30;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    twoFactor({
      issuer: "Kind Joe",
    }),
    nextCookies(),
  ],
  session: {
    expiresIn: SESSION_EXPIRES_IN_SEC,
    updateAge: 60 * 60 * 24,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const name = user.name;
      queueAuthEmail({
        to: user.email,
        subject: "Verify your Kind Joe email",
        text: authVerifyEmailText(name, url),
        html: authVerifyEmailHtml(name, url),
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      const name = user.name;
      queueAuthEmail({
        to: user.email,
        subject: "Reset your Kind Joe password",
        text: `Hi${name?.trim() ? ` ${name.trim()}` : ""},\n\nReset your password: ${url}\n`,
        html: authPasswordResetHtml(name, url),
      });
    },
  },
  secret: getAuthSecret(),
  baseURL:
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
  trustedOrigins: getTrustedOrigins(),
  user: {
    deleteUser: {
      enabled: true,
      deleteTokenExpiresIn: 60 * 60 * 24,
      beforeDelete: async (user) => {
        const row = user as { accountType?: string; account_type?: string };
        const at = row.accountType ?? row.account_type ?? "reader";
        if (at === "staff") {
          throw APIError.from("FORBIDDEN", {
            message: "This account cannot be deleted here.",
            code: "FORBIDDEN",
          });
        }
      },
      sendDeleteAccountVerification: async ({ user, url }) => {
        queueAuthEmail({
          to: user.email,
          subject: "Confirm deleting your Kind Joe account",
          html: authDeleteAccountHtml(url),
          text: authDeleteAccountText(url),
        });
      },
    },
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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const u = user as {
            email: string;
            name: string;
            accountType?: string;
            account_type?: string;
          };
          const accountType = u.accountType ?? u.account_type ?? "reader";
          if (accountType === "staff") return;
          void ensureReaderContactInGhl({
            email: u.email,
            name: u.name ?? "",
          });
        },
      },
    },
  },
});
