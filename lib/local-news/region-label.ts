import { LOCAL_NEWS_REGIONS, textMatchesLocalNewsRegion } from "@/lib/local-news/regions";
import type { ArticleSummary } from "@/types/article";

export function regionLabelForArticle(
  article: ArticleSummary,
  regionFallback?: string | null,
): string | null {
  const list = Array.isArray(article.tags) ? article.tags : [];
  for (const region of LOCAL_NEWS_REGIONS) {
    if (
      list.some((t: { slug?: string }) =>
        (region.tagSlugs as readonly string[]).includes(t?.slug ?? ""),
      )
    ) {
      return region.name;
    }
  }
  for (const region of LOCAL_NEWS_REGIONS) {
    if (textMatchesLocalNewsRegion(article.category, region)) {
      return region.name;
    }
  }
  return regionFallback ?? article.category ?? null;
}
