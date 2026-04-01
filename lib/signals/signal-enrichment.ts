import type { SignalTrustTier, Source } from "@/lib/aggregator/types";
import { normalizeTextForUrlSearch } from "@/lib/signals/signal-source-url";

const TRACKING_PARAMS = new Set([
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

export function normalizeSignalBodyText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (/^\([Hh][Tt][Tt][Pp][Ss]?:\/\/[^)]+\)$/.test(t)) return "";
      return line;
    })
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function markdownToPlainText(raw: string): string {
  return normalizeSignalBodyText(raw)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt: string) =>
      alt?.trim() ? `${alt.trim()} image` : "Image",
    )
    .replace(/\[([^\]]*)\]\([^)]+\)/g, (_, label: string) =>
      label?.trim() || "Link",
    );
}

export function canonicalizeSignalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const cleaned = normalizeTextForUrlSearch(rawUrl.trim());
  if (!cleaned || !/^https?:\/\//i.test(cleaned)) return null;
  try {
    const u = new URL(cleaned);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function guessDisplayNameFromHost(host: string): string {
  if (host.includes("x.com") || host.includes("twitter.com")) return "X";
  if (host.includes("t.me") || host.includes("telegram")) return "Telegram";
  if (host.includes("cbsnews.com")) return "CBS News";
  if (host.includes("reuters.com")) return "Reuters";
  if (host.includes("apnews.com")) return "AP News";
  if (host.includes("bloomberg.com")) return "Bloomberg";
  if (host.includes("wsj.com")) return "WSJ";
  if (host.includes("nytimes.com")) return "The New York Times";
  if (host.includes("usgs.gov")) return "USGS";
  const base = host.replace(/^www\./, "");
  return base.split(".")[0]?.replace(/[-_]/g, " ")?.trim() || "Unknown";
}

function parseHandleFromUrl(source: Source, url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    if (
      (host.endsWith("x.com") || host.endsWith("twitter.com")) &&
      parts.length >= 1 &&
      parts[0] !== "i" &&
      parts[0] !== "home"
    ) {
      return `@${parts[0]}`;
    }
    if ((host.endsWith("t.me") || host.includes("telegram")) && parts.length >= 1) {
      return `@${parts[0]}`;
    }
  } catch {
    return null;
  }
  if (source === "X") return "@unknown";
  return null;
}

export function deriveSignalIdentity(source: Source, canonicalUrl: string | null): {
  sourceDisplayName: string;
  sourceHandle: string | null;
  sourceIconKey: string;
} {
  const host = (() => {
    try {
      return canonicalUrl ? new URL(canonicalUrl).hostname.toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  const defaultName =
    source === "USGS Earthquakes" ? "USGS Earthquakes" : source;

  return {
    sourceDisplayName: host ? guessDisplayNameFromHost(host) : defaultName,
    sourceHandle: parseHandleFromUrl(source, canonicalUrl),
    sourceIconKey:
      source === "USGS Earthquakes"
        ? "usgs"
        : source === "Google News"
          ? "google"
          : source === "Apple Newsroom"
            ? "apple"
            : source.toLowerCase().replace(/\s+/g, "-"),
  };
}

export function deriveTrustMetadata(source: Source): {
  trustTier: SignalTrustTier;
  trustScore: number;
} {
  if (source === "USGS Earthquakes" || source === "Google News" || source === "Apple Newsroom") {
    return { trustTier: "high", trustScore: 88 };
  }
  if (source === "RSS") return { trustTier: "medium", trustScore: 66 };
  if (source === "X" || source === "Telegram") return { trustTier: "low", trustScore: 44 };
  return { trustTier: "medium", trustScore: 58 };
}

export function extractMediaUrls(text: string, canonicalUrl: string | null): string[] {
  const out = new Set<string>();
  const mdImage = /!\[[^\]]*\]\((https?:[^)\s]+)\)/g;
  const mdLink = /\[[^\]]*\]\((https?:[^)\s]+)\)/g;
  const rawUrl = /https?:\/\/[^\s<>\[\]()'"]+/g;

  const maybeAdd = (url: string) => {
    const c = canonicalizeSignalUrl(url);
    if (!c) return;
    const lower = c.toLowerCase();
    if (
      /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(lower) ||
      lower.includes("pbs.twimg.com/media") ||
      lower.includes("twimg.com/media")
    ) {
      out.add(c);
    }
  };

  for (const m of text.matchAll(mdImage)) maybeAdd(m[1]!);
  for (const m of text.matchAll(mdLink)) maybeAdd(m[1]!);
  for (const m of text.matchAll(rawUrl)) maybeAdd(m[0]);
  if (canonicalUrl) maybeAdd(canonicalUrl);
  return [...out].slice(0, 4);
}

