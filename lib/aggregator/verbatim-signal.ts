/**
 * Verbatim signal metadata for ingest: tags, category, impact, and geo are **rule-based only**
 * (source slug, defaults, USGS magnitude/coords). No Gemini / Google GenAI.
 */
import { getLocationFromText } from "./geocoder";
import {
  isXOrTwitterStoryHref,
  resolveSignalSourceUrl,
} from "@/lib/signals/signal-source-url";
import {
  markdownToPlainText,
  normalizeSignalBodyText,
} from "@/lib/signals/signal-enrichment";
import type { Category, GeographicScope, Source } from "./types";

const HEADLINE_MAX = 140;

/** X / Twitter posts: store body exactly as received — no shortened headline, trim, or geo-from-text. */
function isNativeXPostIngest(
  source: Source,
  sourceUrl?: string | null,
): boolean {
  if (source === "X") return true;
  if (source !== "Discord") return false;
  const href = resolveSignalSourceUrl(source, sourceUrl);
  return href != null && isXOrTwitterStoryHref(href);
}

function defaultCategory(source: Source): Category {
  if (source === "USGS Earthquakes") return "Disasters & Emergencies";
  if (source === "Google News" || source === "Apple Newsroom") return "Business";
  return "Geopolitics";
}

function sourceTags(source: Source): string[] {
  const map: Record<Source, string> = {
    X: "x",
    Telegram: "telegram",
    Discord: "discord",
    RSS: "rss",
    "Google News": "google-news",
    "Apple Newsroom": "apple-newsroom",
    "USGS Earthquakes": "usgs",
  };
  return [map[source]];
}

function parseUsgsMagnitude(text: string): number | null {
  const m = text.match(/\bM\s*([0-9]+(?:\.[0-9]+)?)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? v : null;
}

function usgsImpactScore(text: string): number {
  const mag = parseUsgsMagnitude(text);
  if (mag == null) return 55;
  const clamped = Math.min(9, Math.max(4, mag));
  return Math.round(40 + (clamped - 4) * (55 / 5));
}

function headlineFromText(text: string, override?: string | null): string {
  if (override?.trim()) return override.trim().slice(0, 512);
  const t = markdownToPlainText(text).trim();
  if (!t) return "(no text)";
  const lines = t.split(/\r?\n/);
  const firstLine = lines.find((l) => l.trim())?.trim() ?? t;
  if (firstLine.length <= HEADLINE_MAX) return firstLine;
  return `${firstLine.slice(0, HEADLINE_MAX - 1)}…`;
}

export function buildVerbatimSignalFields(params: {
  text: string;
  source: Source;
  /** Canonical post URL when known (used to detect X/Twitter for exact-body ingest). */
  sourceUrl?: string | null;
  headline?: string | null;
  lat?: number | null;
  lng?: number | null;
}): {
  headline: string;
  summary: string;
  category: Category;
  lat: number;
  lng: number;
  city: string;
  country: string;
  geographicScope: GeographicScope;
  adminArea: string;
  impactScore: number;
  tags: string[];
} {
  const {
    text,
    source,
    sourceUrl = null,
    headline: headlineOverride,
    lat: latIn,
    lng: lngIn,
  } = params;

  const exactX = isNativeXPostIngest(source, sourceUrl);

  if (exactX) {
    const body = text;
    const stored = body.length > 0 ? body : "(no text)";
    return {
      headline: stored,
      summary: stored,
      category: "Viral / Social",
      lat: 0,
      lng: 0,
      city: "Unknown",
      country: "Global",
      geographicScope: "global",
      adminArea: "",
      impactScore: 50,
      tags: sourceTags(source),
    };
  }

  const summary = normalizeSignalBodyText(text);
  const headline = headlineFromText(summary || "(no text)", headlineOverride);
  const bodyForSummary = summary || headline;

  const category = defaultCategory(source);
  const tags = sourceTags(source);

  let lat: number;
  let lng: number;
  let city: string;
  let country: string;
  let geographicScope: GeographicScope;
  const adminArea = "";

  if (
    latIn != null &&
    lngIn != null &&
    Number.isFinite(latIn) &&
    Number.isFinite(lngIn)
  ) {
    lat = latIn;
    lng = lngIn;
    city = "Unknown";
    country = "Global";
    geographicScope = source === "USGS Earthquakes" ? "local" : "global";
  } else {
    const geo = getLocationFromText(bodyForSummary);
    lat = geo.lat;
    lng = geo.lng;
    city = geo.city;
    country = geo.country;
    geographicScope =
      lat !== 0 || lng !== 0 ? "local" : "global";
  }

  const impactScore =
    source === "USGS Earthquakes" ? usgsImpactScore(bodyForSummary) : 50;

  return {
    headline,
    summary: bodyForSummary,
    category,
    lat,
    lng,
    city,
    country,
    geographicScope,
    adminArea,
    impactScore,
    tags,
  };
}
