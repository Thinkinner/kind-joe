import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const USER_AGENT = "Mozilla/5.0 (compatible; KindJoeNewsletterBot/1.0)";

const isLoopbackOrPrivateHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "127.0.0.1" || lower === "::1") return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(lower)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(lower)) return true;
  return false;
};

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountType = (session.user as { accountType?: string }).accountType;
  if (accountType !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return NextResponse.json({ error: "Protocol not allowed" }, { status: 400 });
  }

  if (isLoopbackOrPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream responded with ${upstream.status}` },
        { status: 502 },
      );
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Upstream fetch failed: ${error.message}`
            : "Upstream fetch failed",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
