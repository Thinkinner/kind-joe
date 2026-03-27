import type { Source } from "@/lib/aggregator/types";

/** Home / hub URL when we have no article-level link (legacy rows, webhooks). */
export const DEFAULT_SOURCE_HOME: Record<Source, string> = {
  X: "https://x.com",
  Telegram: "https://telegram.org",
  Discord: "https://discord.com",
  RSS: "https://www.usgs.gov/programs/earthquake-hazards",
  "Google News": "https://news.google.com",
  "Apple Newsroom": "https://www.apple.com/newsroom/",
  "USGS Earthquakes": "https://earthquake.usgs.gov/earthquakes/map/",
};

export function resolveSignalSourceUrl(
  source: Source,
  sourceUrl?: string | null,
): string {
  const trimmed = sourceUrl?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) {
    try {
      void new URL(trimmed);
      return trimmed;
    } catch {
      /* use default */
    }
  }
  return DEFAULT_SOURCE_HOME[source] ?? "https://news.google.com";
}
