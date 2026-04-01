import { cookies } from "next/headers";
import { getCurrentAuthContext } from "@better-auth/core/context";
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
import {
  GHL_SIGNUP_ORIGIN_ALLOWED,
  GHL_SIGNUP_ORIGIN_COOKIE,
} from "@/lib/ghl/signup-origin";
import { ensureReaderContactInGhl } from "@/lib/ghl/reader-sync";
import { logAuthEvent } from "@/lib/auth/log";
import { isUsernameTakenByOtherUser } from "@/lib/auth/username-availability";
import {
  normalizeUsernameInput,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "@/lib/auth/username-rules";

/** Fire-and-forget (Better Auth: avoid awaiting email to reduce timing leaks). */
function resolveSessionUserIdFromHookCtx(ctx: unknown): string | undefined {
  if (!ctx || typeof ctx !== "object") return undefined;
  const o = ctx as Record<string, unknown>;
  const direct = o.session as Record<string, unknown> | undefined;
  const u1 = direct?.user as Record<string, unknown> | undefined;
  if (typeof u1?.id === "string" && u1.id.length > 0) return u1.id;
  const inner = o.context as Record<string, unknown> | undefined;
  const nested = inner?.session as Record<string, unknown> | undefined;
  const u2 = nested?.user as Record<string, unknown> | undefined;
  if (typeof u2?.id === "string" && u2.id.length > 0) return u2.id;
  return undefined;
}

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

function hostFromUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeCookieDomain(raw: string | undefined): string | null {
  const d = raw?.trim().toLowerCase();
  if (!d) return null;
  return d.startsWith(".") ? d.slice(1) : d;
}

function isLocalHostLike(host: string | null): boolean {
  if (!host) return false;
  if (host === "localhost") return true;
  if (host.endsWith(".localhost")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return false;
}

function resolveCrossSubdomainCookieDomain(): string | null {
  const raw = process.env.BETTER_AUTH_COOKIE_DOMAIN;
  const normalized = normalizeCookieDomain(raw);
  if (!normalized) return null;

  const mainHost = hostFromUrl(process.env.BETTER_AUTH_URL?.replace(/\/$/, ""));
  const publicHost = hostFromUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  );
  const adminHost = hostFromUrl(
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, ""),
  );
  const hosts = [mainHost, publicHost, adminHost].filter(
    (h): h is string => typeof h === "string" && h.length > 0,
  );

  if (hosts.some((h) => isLocalHostLike(h))) {
    logAuthEvent("warn", "auth_cookie_domain_disabled_for_localhost", {
      cookieDomain: normalized,
      hosts,
    });
    return null;
  }

  const matchesAllHosts = hosts.every(
    (h) => h === normalized || h.endsWith(`.${normalized}`),
  );
  if (!matchesAllHosts) {
    logAuthEvent("warn", "auth_cookie_domain_disabled_for_host_mismatch", {
      cookieDomain: normalized,
      hosts,
    });
    return null;
  }

  return process.env.BETTER_AUTH_COOKIE_DOMAIN?.trim() ?? null;
}

function validateAuthEnvironment(): void {
  const main = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const adminSite = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "");
  const cookieDomain = normalizeCookieDomain(process.env.BETTER_AUTH_COOKIE_DOMAIN);
  const mainHost = hostFromUrl(main);
  const publicHost = hostFromUrl(publicSite);
  const adminHost = hostFromUrl(adminSite);

  if (!main) {
    logAuthEvent("warn", "auth_env_missing_better_auth_url");
  }
  if (mainHost && publicHost && mainHost !== publicHost) {
    logAuthEvent("warn", "auth_env_host_mismatch_main_public", {
      betterAuthHost: mainHost,
      publicHost,
    });
  }

  const usesMultipleHosts =
    Boolean(publicHost) &&
    Boolean(adminHost) &&
    publicHost !== adminHost;
  if (usesMultipleHosts && !cookieDomain) {
    logAuthEvent("warn", "auth_env_cross_host_without_cookie_domain", {
      publicHost: publicHost ?? "",
      adminHost: adminHost ?? "",
    });
  }

  if (cookieDomain) {
    const matchesDomain = (host: string | null) =>
      !host || host === cookieDomain || host.endsWith(`.${cookieDomain}`);
    if (!matchesDomain(publicHost) || !matchesDomain(adminHost)) {
      logAuthEvent("warn", "auth_env_cookie_domain_mismatch", {
        cookieDomain,
        publicHost: publicHost ?? "",
        adminHost: adminHost ?? "",
      });
    }
  }

  if (process.env.NODE_ENV === "production") {
    const insecureUrls = [
      ["BETTER_AUTH_URL", main],
      ["NEXT_PUBLIC_SITE_URL", publicSite],
      ["NEXT_PUBLIC_ADMIN_URL", adminSite],
    ].filter(([, u]) => typeof u === "string" && u.startsWith("http://"));
    if (insecureUrls.length > 0) {
      logAuthEvent("warn", "auth_env_insecure_http_url_in_production", {
        keys: insecureUrls.map(([k]) => k),
      });
    }
  }
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
const CROSS_SUBDOMAIN_COOKIE_DOMAIN = resolveCrossSubdomainCookieDomain();

validateAuthEnvironment();

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
      username: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: CROSS_SUBDOMAIN_COOKIE_DOMAIN != null,
      domain: CROSS_SUBDOMAIN_COOKIE_DOMAIN ?? undefined,
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

          let extraTags: string[] | undefined;
          try {
            const jar = await cookies();
            const raw = jar.get(GHL_SIGNUP_ORIGIN_COOKIE)?.value?.trim();
            if (raw) jar.delete(GHL_SIGNUP_ORIGIN_COOKIE);
            if (raw && GHL_SIGNUP_ORIGIN_ALLOWED.has(raw)) {
              extraTags = [raw];
            }
          } catch {
            /* not in a Next.js request context */
          }

          void ensureReaderContactInGhl({
            email: u.email,
            name: u.name ?? "",
            extraTags,
          });
        },
      },
      /** Runs on every user row update via Better Auth (e.g. POST /update-user). Server Actions cannot replace this for session-based updates without duplicating checks. */
      update: {
        before: async (data, ctx) => {
          if (!data || typeof data !== "object" || !("username" in data)) {
            return { data: {} };
          }
          const raw = (data as { username?: unknown }).username;
          if (raw === undefined) {
            return { data: {} };
          }
          if (raw === null || raw === "") {
            return { data: { username: null } };
          }
          if (typeof raw !== "string") {
            throw APIError.from("BAD_REQUEST", {
              code: "BAD_REQUEST",
              message: "Invalid username.",
            });
          }
          const normalized = normalizeUsernameInput(raw);
          if (
            normalized.length < USERNAME_MIN ||
            normalized.length > USERNAME_MAX
          ) {
            throw APIError.from("BAD_REQUEST", {
              code: "BAD_REQUEST",
              message: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
            });
          }
          if (!USERNAME_PATTERN.test(normalized)) {
            throw APIError.from("BAD_REQUEST", {
              code: "BAD_REQUEST",
              message:
                "Username can only use lowercase letters, numbers, and underscores.",
            });
          }
          let userId = resolveSessionUserIdFromHookCtx(ctx);
          if (!userId) {
            try {
              const ac = await getCurrentAuthContext();
              const id = ac.context.session?.user?.id;
              if (typeof id === "string" && id.length > 0) userId = id;
            } catch {
              /* not in a request context */
            }
          }
          if (
            userId &&
            (await isUsernameTakenByOtherUser(normalized, userId))
          ) {
            throw APIError.from("BAD_REQUEST", {
              code: "BAD_REQUEST",
              message: "That username is already taken.",
            });
          }
          return { data: { username: normalized } };
        },
      },
    },
  },
});
