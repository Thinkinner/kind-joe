import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADS_TXT_BODY, adsTxtHeaders } from "@/lib/ads/ads-txt";
const DEVELOPER_HOSTS = new Set([
  "developer.kindjoe.com",
  "www.developer.kindjoe.com",
  "developer.localhost",
]);

function hostNoPort(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0] ?? "";
}

function shouldBypassDeveloperDocsRewrite(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/ads.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (pathname.includes(".")) return true;
  return false;
}

function normalizeHostFromEnv(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase() || null;
  }
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().replace(/\/$/, "");
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function isServerActionRequest(request: NextRequest): boolean {
  return (
    request.headers.has("next-action") ||
    request.headers.has("Next-Action") ||
    request.headers.has("x-action")
  );
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/ads.txt") {
    return new NextResponse(ADS_TXT_BODY, {
      status: 200,
      headers: adsTxtHeaders(),
    });
  }

  // Never rewrite/redirect Server Action POSTs — redirects return HTML and break RSC.
  if (isServerActionRequest(request)) {
    return NextResponse.next();
  }

  const method = request.method.toUpperCase();
  const adminHost =
    normalizeHostFromEnv(process.env.ADMIN_DASHBOARD_HOST) ??
    normalizeHostFromEnv(process.env.NEXT_PUBLIC_ADMIN_URL);
  const mainSiteBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const adminSiteBase =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_ADMIN_URL) ??
    (adminHost ? `https://${adminHost}` : null);

  const host = hostNoPort(request.headers.get("host"));
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (DEVELOPER_HOSTS.has(host)) {
    if (!shouldBypassDeveloperDocsRewrite(path)) {
      if (path !== "/developers" && !path.startsWith("/developers/")) {
        const docsUrl = request.nextUrl.clone();
        docsUrl.pathname = path === "/" ? "/developers" : `/developers${path}`;
        return NextResponse.rewrite(docsUrl);
      }
    }
  }

  if (adminHost && host === adminHost) {
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    const allowedPrefix =
      path.startsWith("/admin") ||
      path.startsWith("/api/auth") ||
      path.startsWith("/api/admin") ||
      path.startsWith("/api/webhooks") ||
      path.startsWith("/kindjoe/newsletter/preview") ||
      path.startsWith("/newsletter/preview") ||
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path === "/icon.svg" ||
      path === "/robots.txt" ||
      path === "/ads.txt";

    if (!allowedPrefix) {
      if (mainSiteBase) {
        return NextResponse.redirect(new URL(`${path}${search}`, mainSiteBase));
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (
    method === "GET" &&
    adminHost &&
    adminSiteBase &&
    host !== adminHost &&
    path.startsWith("/admin")
  ) {
    const target = new URL(`${path}${search}`, adminSiteBase);
    if (target.href !== request.nextUrl.href) {
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};