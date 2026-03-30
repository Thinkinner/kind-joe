import type { Source } from "@/lib/aggregator/types";

/** Strip zero-width / invisible chars so `https://…` regex and `new URL()` see a clean string (Discord / bridges often inject these). */
export function normalizeTextForUrlSearch(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD\u200E\u200F]/g, "");
}

/** Normalize a JSON/body string to a canonical https URL, or null if invalid / missing. */
export function parseHttpStoryUrlCandidate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = normalizeTextForUrlSearch(value).trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

/**
 * Outbound “open story” target: stored `source_url` only (no generic hub fallbacks).
 * Accepts scheme-less `host/path` values by prefixing `https://`.
 */
export function resolveSignalSourceUrl(
  _source: Source,
  sourceUrl?: string | null,
): string | null {
  const raw =
    typeof sourceUrl === "string" ? normalizeTextForUrlSearch(sourceUrl).trim() : "";
  if (!raw) return null;
  const direct = parseHttpStoryUrlCandidate(raw);
  if (direct) return direct;
  if (/\s/.test(raw) || /[<>"']/.test(raw)) return null;
  if (/^[\w.-]+\.[a-zA-Z]{2,}([/?#]|$)/.test(raw)) {
    return parseHttpStoryUrlCandidate(`https://${raw}`);
  }
  return null;
}

/** True when the outbound URL is X / Twitter (or common preview domains), from hostname only. */
export function isXOrTwitterStoryHref(href: string): boolean {
  try {
    const h = new URL(href).hostname.toLowerCase();
    return (
      h === "x.com" ||
      h.endsWith(".x.com") ||
      h === "twitter.com" ||
      h.endsWith(".twitter.com") ||
      h === "t.co" ||
      h === "vxtwitter.com" ||
      h.endsWith(".vxtwitter.com") ||
      h === "fxtwitter.com" ||
      h.endsWith(".fxtwitter.com") ||
      h === "fixvx.com" ||
      h.endsWith(".fixvx.com")
    );
  } catch {
    return false;
  }
}

/**
 * Feed / dossier chip text: **"X"** for X/Twitter story URLs; else truncated `host/path…`.
 * `href` must be a normalized http(s) URL (e.g. from {@link resolveSignalSourceUrl}).
 */
export function signalOutboundLinkLabel(
  href: string,
  source: Source,
  maxLen: number,
): string {
  if (isXOrTwitterStoryHref(href)) return "X";
  return formatSignalSourceLinkLabel(source, href, maxLen);
}

/**
 * Truncated `hostname/path…` for display (non–X/Twitter); falls back to `source` if parse fails.
 */
export function formatSignalSourceLinkLabel(
  source: Source,
  sourceUrl?: string | null,
  maxLen = 44,
): string {
  const trimmed = sourceUrl?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const host = u.hostname.replace(/^www\./i, "");
      let path = u.pathname.replace(/\/$/, "") + u.search;
      if (path === "") path = "";
      let s = path ? `${host}${path}` : host;
      if (s.length > maxLen) s = `${s.slice(0, Math.max(0, maxLen - 1))}…`;
      return s;
    } catch {
      /* fall through */
    }
  }
  return source;
}
