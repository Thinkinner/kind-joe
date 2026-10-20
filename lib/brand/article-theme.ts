import {
  LOCAL_NEWS_REGIONS,
  textMatchesLocalNewsRegion,
} from "@/lib/local-news/regions";

export const VENTURA_COUNTY_TAG = "ventura-county";
export const OXNARD_NEWS_TAG = "oxnard-news";
export const LA_NEWS_TAG = "la-news";
export const SAN_LUIS_OBISPO_TAG = "san-luis-obispo";
export const SLO_TAG = "slo";
export const SANLUISOBISPO_TAG = "sanluisobispo";

const SAN_LUIS_OBISPO_TAG_SLUGS = [
  SAN_LUIS_OBISPO_TAG,
  SLO_TAG,
  SANLUISOBISPO_TAG,
] as const;

export function hasVenturaCountyTag(
  tags: Array<{ slug?: string | null }> | undefined | null,
): boolean {
  return Boolean(tags?.some((tag) => tag.slug === VENTURA_COUNTY_TAG));
}

export function hasOxnardNewsTag(
  tags: Array<{ slug?: string | null }> | undefined | null,
): boolean {
  return Boolean(tags?.some((tag) => tag.slug === OXNARD_NEWS_TAG));
}

export function hasLaNewsTag(
  tags: Array<{ slug?: string | null }> | undefined | null,
): boolean {
  return Boolean(tags?.some((tag) => tag.slug === LA_NEWS_TAG));
}

export function hasSanLuisObispoTag(
  tags: Array<{ slug?: string | null }> | undefined | null,
): boolean {
  return Boolean(
    tags?.some((tag) =>
      SAN_LUIS_OBISPO_TAG_SLUGS.includes(
        tag.slug as (typeof SAN_LUIS_OBISPO_TAG_SLUGS)[number],
      ),
    ),
  );
}

/** Local desks (LA / Ventura / SLO) show a main image; Kind Joe articles stay text-first. */
export function hasLocalDeskCoverTag(
  tags: Array<{ slug?: string | null }> | undefined | null,
): boolean {
  return (
    hasVenturaCountyTag(tags) ||
    hasOxnardNewsTag(tags) ||
    hasLaNewsTag(tags) ||
    hasSanLuisObispoTag(tags)
  );
}

/** Prefer this for homepage/cards — also catches local stories matched by category. */
export function articleShowsMainImage(article: {
  tags?: Array<{ slug?: string | null }> | null;
  category?: string | null;
}): boolean {
  if (hasLocalDeskCoverTag(article.tags)) return true;
  for (const region of LOCAL_NEWS_REGIONS) {
    if (textMatchesLocalNewsRegion(article.category, region)) return true;
    const list = Array.isArray(article.tags) ? article.tags : [];
    if (
      list.some((tag) =>
        (region.tagSlugs as readonly string[]).includes(tag?.slug ?? ""),
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Canonical public article URL — always /{slug}, never /ventura/{slug}. */
export function articlePublicPath(slug: string): string {
  return `/${slug}`;
}

export type ArticleBrandTheme = {
  badge: string;
  authorLinkHover: string;
  accentCta: string;
  sidebarCta: string;
  sourceLink: string;
  relatedTitle: string;
  publisherDefault: string;
  publisherAvatar: string;
  shareCtaLabel: string;
  conversationHint: string;
  mainClassName: string;
  articleClassName: string;
  headerMetaClassName: string;
};

export function getArticleBrandTheme(isVentura: boolean): ArticleBrandTheme {
  if (isVentura) {
    return {
      badge: "bg-orange-600",
      authorLinkHover: "hover:text-orange-700",
      accentCta:
        "border-orange-300 bg-orange-50 text-orange-700 hover:border-orange-400 hover:bg-orange-100",
      sidebarCta:
        "border-orange-300 bg-orange-50 text-orange-700 hover:border-orange-400 hover:bg-orange-100",
      sourceLink: "text-orange-600 hover:underline",
      relatedTitle: "More Ventura coverage",
      publisherDefault: "Joe Knows Ventura",
      publisherAvatar: "/brand/ventura-profile.jpg",
      shareCtaLabel: "Have your say",
      conversationHint: "Share your perspective and keep the discussion going.",
      mainClassName: "py-4 sm:py-6 lg:py-10",
      articleClassName: "bg-white",
      headerMetaClassName: "border-y border-neutral-200 py-4 sm:py-5",
    };
  }

  return {
    badge: "bg-red-600",
    authorLinkHover: "hover:text-red-700",
    accentCta:
      "border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100",
    sidebarCta:
      "border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100",
    sourceLink: "text-red-600 hover:underline",
    relatedTitle: "More on this topic",
    publisherDefault: "KindJoe",
    publisherAvatar: "/brand/kindjoe-profile.jpg",
    shareCtaLabel: "Share your take",
    conversationHint: "React with your take and see what people think below.",
    mainClassName: "bg-neutral-50/70 py-6 sm:py-8",
    articleClassName:
      "overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)]",
    headerMetaClassName:
      "rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-4 sm:px-5 sm:py-5",
  };
}
