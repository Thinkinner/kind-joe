/** Inventory rules so AdSense is not shown next to prohibited or thin pages. */

const MINOR_TERM =
  /\b(child|children|minor|minors|underage|under-age|young victim|young victims|elementary|juvenile)\b/i;

const SEXUAL_CRIME_TERM =
  /\b(molest|molestation|molested|sexual abuse|sexually abus(?:e|ed|ing)|lewd acts?|child porn|csam|child sex|rape of (?:a )?child|statutory rape)\b/i;

export const ADSENSE_MIN_BODY_WORDS_FOR_ADS = 400;

export function isAdsenseRestrictedStory(
  title: string,
  excerpt?: string | null,
): boolean {
  const text = `${title}\n${excerpt ?? ""}`.trim();
  if (!text) return false;
  if (/child\s+molest|molestation/i.test(text)) return true;
  return SEXUAL_CRIME_TERM.test(text) && MINOR_TERM.test(text);
}

export function countInventoryWords(markdown: string | null | undefined): number {
  if (!markdown?.trim()) return 0;
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~`|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isAdsenseEligibleInventory(input: {
  title: string;
  excerpt?: string | null;
  bodyMarkdown?: string | null;
}): boolean {
  if (isAdsenseRestrictedStory(input.title, input.excerpt)) return false;
  const words = countInventoryWords(input.bodyMarkdown);
  if (words > 0 && words < ADSENSE_MIN_BODY_WORDS_FOR_ADS) return false;
  return true;
}

export function pickAdsenseSafeArticles<
  T extends { title: string; excerpt?: string | null },
>(articles: T[], limit: number): T[] {
  return articles
    .filter((article) => !isAdsenseRestrictedStory(article.title, article.excerpt))
    .slice(0, Math.max(limit, 0));
}
