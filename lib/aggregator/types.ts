export type Source = "X" | "Telegram" | "Discord" | "RSS";
export type Category =
  | "Geopolitics"
  | "Conflicts & Wars"
  | "Economy & Markets"
  | "Tech & Science"
  | "Disasters & Emergencies"
  | "Viral / Social";

/** How “big” the story is geographically — drives local-area news and filters. */
export type GeographicScope = "local" | "regional" | "national" | "global";

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
  category: Category;
  lat: number;
  lng: number;
  city: string;
  country: string;
  /** local = city/neighborhood; regional = state/province/metro; national = whole country; global = cross-border. */
  geographicScope: GeographicScope;
  /** State, province, county, metro, or district — main lever for “local area” coverage. */
  adminArea: string;
  impactScore: number; // 1-100
  timestamp: number;
  tags: string[];
}

/**
 * Payload on Pusher `new-signal`: older publishers may omit fields (e.g. geographicScope).
 * Always pass through {@link normalizePusherSignal} (or equivalent) before treating as {@link Signal}.
 */
export type PusherSignalPayload = Partial<Signal> &
  Pick<Signal, "id" | "headline" | "timestamp" | "lat" | "lng" | "impactScore">;
