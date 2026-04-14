import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/auth/rate-limit";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";

const requestSchema = z.object({
  url: z.string().url().max(2000),
});

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_HTML_BYTES = 1024 * 1024;

function isForbiddenHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "127.0.0.1" || h === "::1") return true;
  if (h.startsWith("10.") || h.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstMatch(input: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    const raw = match?.[1]?.trim();
    if (raw) return decodeEntities(compactWhitespace(raw));
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkSocialRateLimit(`link-preview-ip:${ip}`, 30, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
        },
      );
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const candidate = new URL(parsed.data.url);
    if (!ALLOWED_PROTOCOLS.has(candidate.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol." }, { status: 400 });
    }
    if (isForbiddenHost(candidate.hostname)) {
      return NextResponse.json({ error: "Forbidden URL host." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(candidate.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KindJoeLinkPreview/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json(
        { error: `Preview fetch failed (${response.status}).` },
        { status: 502 },
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "URL is not an HTML page." }, { status: 415 });
    }

    const htmlRaw = await response.text();
    const html = htmlRaw.slice(0, MAX_HTML_BYTES);

    const title =
      firstMatch(html, [
        /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) ?? candidate.hostname;

    const description =
      firstMatch(html, [
        /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      ]) ?? null;

    const imageUrl =
      firstMatch(html, [
        /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      ]) ?? null;

    const siteName =
      firstMatch(html, [
        /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      ]) ?? candidate.hostname;

    const resolvedImageUrl = imageUrl ? new URL(imageUrl, candidate).toString() : null;

    return NextResponse.json({
      url: candidate.toString(),
      title,
      description,
      imageUrl: resolvedImageUrl,
      siteName,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Preview request timed out." }, { status: 504 });
    }
    console.error("link_preview_failed", err);
    return NextResponse.json(
      { error: "Could not fetch link preview." },
      { status: 500 },
    );
  }
}
