import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hostNoPort(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0] ?? "";
}

export function middleware(request: NextRequest) {
  const adminHost = process.env.ADMIN_DASHBOARD_HOST?.split(":")[0];
  const mainSiteBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? null;
  const adminSiteBase =
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "") ??
    (adminHost ? `https://${adminHost}` : null);

  const host = hostNoPort(request.headers.get("host"));
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // Kind Joe Watch / Signals UI is temporarily disabled — remove to restore /kindjoe-watch.
  if (path === "/kindjoe-watch" || path.startsWith("/kindjoe-watch/")) {
    return NextResponse.redirect(new URL("/", request.url));
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
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path === "/icon.svg" ||
      path === "/robots.txt";

    if (!allowedPrefix) {
      if (mainSiteBase) {
        return NextResponse.redirect(new URL(`${path}${search}`, mainSiteBase));
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (adminHost && adminSiteBase && host !== adminHost && path.startsWith("/admin")) {
    return NextResponse.redirect(new URL(`${path}${search}`, adminSiteBase));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
