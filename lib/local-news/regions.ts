/** Canonical local-news article tags for homepage + section pages. */

export const LOCAL_NEWS_REGIONS = [
  {
    id: "ventura",
    name: "Ventura County",
    slug: "ventura-county",
    /**
     * Tag slugs that count as this region (first is canonical).
     * Writers often use `venturacountynews` on newer desk stories; the partner
     * Ventura articles API accepts both.
     */
    tagSlugs: ["ventura-county", "venturacountynews"] as const,
    /**
     * Loose match against category / category rows / tag names & slugs.
     * Prefer multi-char tokens — avoid bare "la" / "slo" (too many false hits).
     */
    matchKeywords: ["ventura"] as const,
    href: "/ventura-county",
    eyebrow: "Local",
    description: "Local stories from Ventura County communities.",
    accentClass: "text-orange-600",
    pillClass:
      "border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300 hover:bg-orange-100",
    badgeClass: "bg-orange-600",
    accentBarClass: "bg-orange-500",
    softBgClass: "from-orange-50/90",
  },
  {
    id: "oxnard",
    name: "Oxnard News",
    slug: "oxnard-news",
    tagSlugs: ["oxnard-news"] as const,
    /** Exact tag only. A category or other tag that merely says "oxnard" does not count. */
    matchKeywords: [] as const,
    href: "/oxnard-news",
    eyebrow: "City",
    description: "Oxnard stories and community updates.",
    accentClass: "text-green-700",
    pillClass:
      "border-green-200 bg-green-50 text-green-800 hover:border-green-300 hover:bg-green-100",
    badgeClass: "bg-green-700",
    accentBarClass: "bg-green-600",
    softBgClass: "from-green-50/90",
  },
  {
    id: "la",
    name: "L.A. News",
    slug: "la-news",
    tagSlugs: ["la-news"] as const,
    matchKeywords: [
      "los angeles",
      "l.a.",
      "la-news",
      "la news",
      "la county",
    ] as const,
    href: "/la-news",
    eyebrow: "City & county",
    description: "Los Angeles city and county stories that matter locally.",
    accentClass: "text-blue-700",
    pillClass:
      "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100",
    badgeClass: "bg-blue-600",
    accentBarClass: "bg-blue-600",
    softBgClass: "from-blue-50/90",
  },
  {
    id: "slo",
    name: "San Luis Obispo",
    slug: "san-luis-obispo",
    tagSlugs: ["san-luis-obispo", "slo", "sanluisobispo"] as const,
    matchKeywords: [
      "san luis",
      "obispo",
      "san-luis-obispo",
      "sanluisobispo",
    ] as const,
    href: "/san-luis-obispo",
    eyebrow: "County",
    description: "San Luis Obispo County news and community updates.",
    accentClass: "text-teal-700",
    pillClass:
      "border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-300 hover:bg-teal-100",
    badgeClass: "bg-teal-700",
    accentBarClass: "bg-teal-600",
    softBgClass: "from-teal-50/90",
  },
] as const;

export type LocalNewsRegion = (typeof LOCAL_NEWS_REGIONS)[number];
export type LocalNewsTagSlug = LocalNewsRegion["slug"];

export const LOCAL_NEWS_TAG_SLUGS = LOCAL_NEWS_REGIONS.flatMap((r) => [
  ...r.tagSlugs,
]);

export function getLocalNewsRegionBySlug(
  slug: string | null | undefined,
): LocalNewsRegion | undefined {
  if (!slug) return undefined;
  return LOCAL_NEWS_REGIONS.find(
    (region) =>
      region.slug === slug ||
      (region.tagSlugs as readonly string[]).includes(slug),
  );
}

export function getRegionTagSlugs(region: LocalNewsRegion): string[] {
  return [...region.tagSlugs];
}

export function getRegionMatchKeywords(region: LocalNewsRegion): string[] {
  return [...region.matchKeywords];
}

export function getPrimaryLocalTagSlug(
  tags: Array<{ slug?: string | null }> | undefined | null,
): LocalNewsTagSlug | null {
  if (!tags?.length) return null;
  for (const region of LOCAL_NEWS_REGIONS) {
    if (
      tags.some((tag) =>
        (region.tagSlugs as readonly string[]).includes(tag.slug ?? ""),
      )
    ) {
      return region.slug;
    }
  }
  return null;
}

/** True when haystack contains any of the region's keywords or exact tag slugs. */
export function textMatchesLocalNewsRegion(
  haystack: string | null | undefined,
  region: LocalNewsRegion,
): boolean {
  const text = (haystack ?? "").trim().toLowerCase();
  if (!text) return false;
  if (
    (region.tagSlugs as readonly string[]).some(
      (slug) => text === slug || text.includes(slug),
    )
  ) {
    return true;
  }
  return (region.matchKeywords as readonly string[]).some((kw) =>
    text.includes(kw.toLowerCase()),
  );
}

/**
 * Canonical region tag slug(s) to attach when category/tags imply a region
 * (e.g. category "Ventura County" → "ventura-county").
 */
export function inferCanonicalRegionTagSlugs(input: {
  category?: string | null;
  tags?: string[] | null;
}): LocalNewsTagSlug[] {
  const found = new Set<LocalNewsTagSlug>();
  const category = input.category ?? "";
  const tagList = input.tags ?? [];

  for (const region of LOCAL_NEWS_REGIONS) {
    if (textMatchesLocalNewsRegion(category, region)) {
      found.add(region.slug);
      continue;
    }
    if (tagList.some((tag) => textMatchesLocalNewsRegion(tag, region))) {
      found.add(region.slug);
    }
  }

  return [...found];
}
