export type Source =
  | "X"
  | "Telegram"
  | "Discord"
  | "RSS"
  | "Google News"
  | "Apple Newsroom"
  | "USGS Earthquakes";
export type Category =
  | "World"
  | "Military"
  | "Finance"
  | "Environment"
  | "Energy"
  | "Tech"
  | "Health"
  | "Society";

/** How “big” the story is geographically — drives local-area news and filters. */
export type GeographicScope = "local" | "regional" | "national" | "global";
export type SignalTrustTier = "low" | "medium" | "high";

export const GEO_SCOPE_LABELS: Record<GeographicScope, string> = {
  local: "Local",
  regional: "Regional",
  national: "National",
  global: "Global",
};

export interface Signal {
  id: string;
  headline: string;
  summary: string;
  source: Source;
  /** Permalink to the story or feed item; omitted for legacy / webhook-only signals. */
  sourceUrl?: string | null;
  category: Category;
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  /** local = city/neighborhood; regional = state/province/metro; national = whole country; global = cross-border. */
  geographicScope: GeographicScope;
  /** State, province, county, metro, or district — main lever for “local area” coverage. */
  adminArea: string;
  impactScore: number; // 1-100
  timestamp: number;
  tags: string[];
  /** Canonical normalized source URL with tracking params removed. */
  canonicalSourceUrl?: string | null;
  /** Display metadata used by Glint-style source row. */
  sourceDisplayName?: string | null;
  sourceHandle?: string | null;
  sourceIconKey?: string | null;
  sourceAvatarUrl?: string | null;
  sourceVerified?: boolean | null;
  /** Reputation metadata for source chip. */
  trustTier?: SignalTrustTier | null;
  trustScore?: number | null;
  /** Extracted media URLs from summary/body markdown. */
  mediaUrls?: string[] | null;
  enrichmentProvider?: string | null;
  enrichmentModel?: string | null;
  enrichmentConfidence?: number | null;
}

/**
 * Payload on Pusher `new-signal`: older publishers may omit fields (e.g. geographicScope).
 * Normalize on the client (see `normalizePusherSignal` in the Signals page) before using as {@link Signal}.
 */
export type PusherSignalPayload = Partial<Signal> &
  Pick<Signal, "id" | "headline" | "timestamp" | "lat" | "lng" | "impactScore"> & {
    /** Snake_case alias; some publishers / serializers use this instead of {@link Signal.sourceUrl}. */
    source_url?: string;
  };
