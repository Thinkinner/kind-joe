/** Canonical local-news article tags for homepage + section pages. */

export const LOCAL_NEWS_REGIONS = [
  {
    id: "ventura",
    name: "Ventura County",
    slug: "ventura-county",
    /** Tag slugs that count as this region (first is canonical). */
    tagSlugs: ["ventura-county"] as const,
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
    id: "la",
    name: "L.A. News",
    slug: "la-news",
    tagSlugs: ["la-news"] as const,
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
