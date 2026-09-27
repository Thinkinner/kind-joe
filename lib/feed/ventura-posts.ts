import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { venturaPosts } from "@/db/schema";

const MAX_LEGACY_LIST = 50;

/** Path segments that are routing prefixes, not article slugs. */
const PATH_PREFIXES = new Set([
  "ventura",
  "articles",
  "news",
  "story",
  "stories",
  "post",
  "posts",
]);

/**
 * Pull the article slug from a Kind Joe (or similar) destination URL so
 * partner sites can deep-link on their own domain instead of kindjoe.com.
 */
export function extractArticleSlugFromDestinationUrl(
  destinationUrl: string,
): string | null {
  const raw = (destinationUrl || "").trim();
  if (!raw) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;

    const filtered = parts.filter(
      (part) => !PATH_PREFIXES.has(part.toLowerCase()),
    );
    const slug = (filtered[filtered.length - 1] || parts[parts.length - 1] || "")
      .trim()
      .toLowerCase();
    return slug || null;
  } catch {
    const cleaned = raw.replace(/^https?:\/\/[^/]+/i, "").replace(/^\//, "");
    const segment = cleaned.split(/[/?#]/)[0]?.trim().toLowerCase();
    return segment || null;
  }
}

function normalizePartnerOrigin(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export type VenturaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

export type VenturaPost = {
  id: number;
  imageUrl: string;
  /**
   * Click URL for this card.
   * - Kind Joe site: canonical Kind Joe URL
   * - Partners using `?linkBase=https://partner.com`: rewritten to partner domain
   */
  destinationUrl: string;
  /** Original Kind Joe (or external) URL — never rewritten. */
  canonicalUrl: string;
  /**
   * Article slug when the destination points at a Kind Joe story.
   * Partners should link to `https://their-domain.com/{slug}` (or their route).
   */
  slug: string | null;
  /** Relative path helper, e.g. `/gun-recovered-...`. Null when no slug. */
  path: string | null;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type VenturaPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
  limit: number;
  offset: number;
};

type VenturaPostRow = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
  caption: string | null;
  isPinned: boolean | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export function mapVenturaPostForPartner(
  row: VenturaPostRow,
  linkBase?: string | null,
): VenturaPost {
  const canonicalUrl = row.destinationUrl;
  const slug = extractArticleSlugFromDestinationUrl(canonicalUrl);
  const path = slug ? `/${slug}` : null;
  const origin = normalizePartnerOrigin(linkBase);

  let destinationUrl = canonicalUrl;
  if (origin && slug) {
    destinationUrl = `${origin}/${slug}`;
  }

  return {
    id: row.id,
    imageUrl: row.imageUrl,
    destinationUrl,
    canonicalUrl,
    slug,
    path,
    caption: row.caption,
    isPinned: row.isPinned,
    order: row.order,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function listVenturaPosts(options?: {
  linkBase?: string | null;
}): Promise<VenturaPost[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await db
      .select({
        id: venturaPosts.id,
        imageUrl: venturaPosts.imageUrl,
        destinationUrl: venturaPosts.destinationUrl,
        caption: venturaPosts.caption,
        isPinned: venturaPosts.isPinned,
        order: venturaPosts.order,
        isActive: venturaPosts.isActive,
        createdAt: venturaPosts.createdAt,
      })
      .from(venturaPosts)
      .where(or(eq(venturaPosts.isActive, true), isNull(venturaPosts.isActive)))
      .orderBy(
        desc(venturaPosts.isPinned),
        asc(venturaPosts.order),
        desc(venturaPosts.id),
      )
      .limit(MAX_LEGACY_LIST);

    return rows.map((row) => mapVenturaPostForPartner(row, options?.linkBase));
  } catch (error) {
    console.error("ventura posts query failed:", error);
    return [];
  }
}

export async function listVenturaPostCards(): Promise<VenturaPostCard[]> {
  const rows = await listVenturaPosts();
  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    destinationUrl: row.destinationUrl,
  }));
}

export async function listVenturaPostsPage(params?: {
  limit?: number;
  offset?: number;
  linkBase?: string | null;
}): Promise<VenturaPage<VenturaPost>> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);

  if (!process.env.DATABASE_URL) {
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }

  try {
    const rows = await db
      .select({
        id: venturaPosts.id,
        imageUrl: venturaPosts.imageUrl,
        destinationUrl: venturaPosts.destinationUrl,
        caption: venturaPosts.caption,
        isPinned: venturaPosts.isPinned,
        order: venturaPosts.order,
        isActive: venturaPosts.isActive,
        createdAt: venturaPosts.createdAt,
      })
      .from(venturaPosts)
      .where(or(eq(venturaPosts.isActive, true), isNull(venturaPosts.isActive)))
      .orderBy(
        desc(venturaPosts.isPinned),
        asc(venturaPosts.order),
        desc(venturaPosts.id),
      )
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((row) =>
      mapVenturaPostForPartner(row, params?.linkBase),
    );

    return {
      items,
      hasMore,
      nextOffset: offset + items.length,
      limit,
      offset,
    };
  } catch (error) {
    console.error("ventura posts paged query failed:", error);
    return {
      items: [],
      hasMore: false,
      nextOffset: offset,
      limit,
      offset,
    };
  }
}
