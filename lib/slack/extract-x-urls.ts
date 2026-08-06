const HTTP_URL_RE = /https?:\/\/[^\s<>()"]+/gi;
const SLACK_BRACKET_URL_RE = /<(https?:\/\/[^|>\s]+)(?:\|[^>]*)?>/gi;

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
    const cleaned = normalizeTextForUrlSearch(raw.trim())
      // Slack sometimes leaves trailing punctuation glued on
      .replace(/[),.;!?]+$/g, "");
    const u = new URL(cleaned);
    if (!/^https?:$/i.test(u.protocol)) return null;
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.hash = "";
    // Normalize twitter.com → x.com for stable dedupe
    if (
      u.hostname.toLowerCase() === "twitter.com" ||
      u.hostname.toLowerCase().endsWith(".twitter.com")
    ) {
      u.hostname = "x.com";
    }
    return u.toString();
  } catch {
    return null;
  }
}

function collectCandidateUrls(text: string): string[] {
  const normalized = normalizeTextForUrlSearch(text);
  const out: string[] = [];

  for (const match of normalized.matchAll(SLACK_BRACKET_URL_RE)) {
    if (match[1]) out.push(match[1]);
  }

  const plain = normalized.match(HTTP_URL_RE) ?? [];
  for (const raw of plain) {
    // Drop Slack label suffix if regex captured "url|label"
    out.push(raw.split("|")[0] ?? raw);
  }

  return out;
}

/** Extract unique X/Twitter status URLs from Slack message text. */
export function extractXUrlsFromText(text: string): string[] {
  const urls = collectCandidateUrls(text)
    .map((u) => canonicalizeUrl(u))
    .filter((u): u is string => u !== null && isXHost(u));

  // Prefer status URLs when present
  const statusUrls = urls.filter((u) => /\/status\/\d+/i.test(u));
  const chosen = statusUrls.length > 0 ? statusUrls : urls;
  return [...new Set(chosen)];
}

/** Also pull URLs from Slack attachments / blocks payloads. */
export function extractXUrlsFromSlackEvent(event: {
  text?: string | null;
  attachments?: Array<{
    original_url?: string;
    from_url?: string;
    title_link?: string;
    text?: string;
  }> | null;
  blocks?: unknown;
}): string[] {
  const chunks: string[] = [];
  if (event.text) chunks.push(event.text);

  for (const att of event.attachments ?? []) {
    if (att.original_url) chunks.push(att.original_url);
    if (att.from_url) chunks.push(att.from_url);
    if (att.title_link) chunks.push(att.title_link);
    if (att.text) chunks.push(att.text);
  }

  if (event.blocks) {
    try {
      chunks.push(JSON.stringify(event.blocks));
    } catch {
      // ignore
    }
  }

  return extractXUrlsFromText(chunks.join("\n"));
}
