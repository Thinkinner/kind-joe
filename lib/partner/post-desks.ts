/** Desk keys accepted by POST /api/partner/posts. */
export const PARTNER_POST_DESK_IDS = [
  "kindjoe",
  "ventura",
  "la",
  "oxnard",
  "slo",
] as const;

export type PartnerPostDeskId = (typeof PARTNER_POST_DESK_IDS)[number];

const ALIASES: Record<string, PartnerPostDeskId> = {
  kindjoe: "kindjoe",
  "kind-joe": "kindjoe",
  posts: "kindjoe",
  ventura: "ventura",
  "ventura-county": "ventura",
  la: "la",
  "la-news": "la",
  "los-angeles": "la",
  joeknowsla: "la",
  oxnard: "oxnard",
  "oxnard-news": "oxnard",
  cityofox: "oxnard",
  slo: "slo",
  "san-luis-obispo": "slo",
  joefromslo: "slo",
};

export function resolvePartnerPostDesk(
  raw: string | null | undefined,
): PartnerPostDeskId | null {
  const key = (raw ?? "").trim().toLowerCase();
  if (!key) return null;
  return ALIASES[key] ?? null;
}
