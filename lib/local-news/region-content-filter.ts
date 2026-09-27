import { and, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  articles,
  categories,
  tags,
} from "@/db/schema";
import {
  getRegionMatchKeywords,
  getRegionTagSlugs,
  type LocalNewsRegion,
} from "@/lib/local-news/regions";

/**
 * Same matching rules as /ventura-county (and other local desks):
 * category column, linked categories, tag name/slug keyword hits,
 * or exact region tag slugs. Ventura keywords do not match LA desk tags.
 */
export function regionContentFilter(region: LocalNewsRegion) {
  const keywords = getRegionMatchKeywords(region);
  const matchSlugs = getRegionTagSlugs(region);
  const keywordMatchers = keywords.flatMap((kw) => [
    ilike(articles.category, `%${kw}%`),
    exists(
      db
        .select({ one: sql`1` })
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(
          and(
            eq(articleCategories.articleId, articles.id),
            or(
              ilike(categories.name, `%${kw}%`),
              ilike(categories.slug, `%${kw}%`),
            ),
          ),
        ),
    ),
    exists(
      db
        .select({ one: sql`1` })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(
          and(
            eq(articleTags.articleId, articles.id),
            or(ilike(tags.name, `%${kw}%`), ilike(tags.slug, `%${kw}%`)),
          ),
        ),
    ),
  ]);

  return or(
    ...keywordMatchers,
    exists(
      db
        .select({ one: sql`1` })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(
          and(
            eq(articleTags.articleId, articles.id),
            inArray(tags.slug, matchSlugs),
          ),
        ),
    ),
  );
}
