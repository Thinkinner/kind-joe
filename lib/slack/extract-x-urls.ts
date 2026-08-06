const HTTP_URL_RE = /https?:\/\/[^\s<>()"]+/gi;

const TRACKING_PARAMS = new Set([
  "s",
  "t",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
]);

function normalizeTextForUrlSearch(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD\u200E\u200F]/g, "");
}

function isXHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "x.com" ||
      host.endsWith(".x.com") ||
      host === "twitter.com" ||
      host.endsWith(".twitter.com")
    );
  } catch {
    return false;
  }
}

function canonicalizeUrl(raw: string): string | null {
  try {
    const cleaned = normalizeTextForUrlSearch(raw.trim());
    const u = new URL(cleaned);
    if (!/^https?:$/i.test(u.protocol)) return null;
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.hash = "";
    // Normalize twitter.com → x.com for stable dedupe
    if (u.hostname.toLowerCase() === "twitter.com" || u.hostname.toLowerCase().endsWith(".twitter.com")) {
      u.hostname = "x.com";
    }
    return u.toString();
  } catch {
    return null;
  }
}

/** Extract unique X/Twitter status URLs from Slack message text. */
export function extractXUrlsFromText(text: string): string[] {
  const matches = normalizeTextForUrlSearch(text).match(HTTP_URL_RE) ?? [];
  const urls = matches
    .map((u) => u.replace(/[),.;!?]+$/g, ""))
    .map((u) => canonicalizeUrl(u))
    .filter((u): u is string => u !== null && isXHost(u));

  // Prefer status URLs when present
  const statusUrls = urls.filter((u) => /\/status\/\d+/i.test(u));
  const chosen = statusUrls.length > 0 ? statusUrls : urls;
  return [...new Set(chosen)];
}
