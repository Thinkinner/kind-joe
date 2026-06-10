import { getRenderableArticles } from "@/lib/rss-news/news";
import { ExternalHeadlinesPanel } from "@/components/rss-news/external-headlines-panel";

/** ADSENSE_HOLDBACK: was 36 before review. Restore after approval — see docs/homepage-adsense-holdback.md */
const MAX_HEADLINES = 6;

export async function ExternalHeadlinesSection() {
  const articles = await getRenderableArticles(MAX_HEADLINES);
  if (articles.length === 0) return null;

  return <ExternalHeadlinesPanel articles={articles} />;
}
