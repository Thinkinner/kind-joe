import {
  ensureLocalNewsTags,
  getArticlesAction,
  getArticlesByTagSlugAction,
  getTopStoriesAction,
} from "@/lib/actions/articles";
import { pickAdsenseSafeArticles } from "@/lib/ads/adsense-inventory-policy";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { LatestStoriesRow } from "@/components/home/latest-stories-row";
import { LocalDesks } from "@/components/home/local-desks";
import { TopStoriesPack } from "@/components/home/top-stories-pack";
import { LOCAL_NEWS_REGIONS } from "@/lib/local-news/regions";

const TOP_STORY_LIMIT = 5;
const LATEST_LIMIT = 8;
const LOCAL_LIMIT = 4;
const LOCAL_FETCH = 12;

export async function FrontPage() {
  await ensureLocalNewsTags();

  const taggedTop = pickAdsenseSafeArticles(
    await getTopStoriesAction(16),
    TOP_STORY_LIMIT,
  );
  const latestPool = pickAdsenseSafeArticles(await getArticlesAction(24, 0), 24);
  const topStories =
    taggedTop.length > 0
      ? taggedTop
      : latestPool.slice(0, TOP_STORY_LIMIT);

  const usedIds = new Set(topStories.map((article) => article.id));
  const latest = latestPool
    .filter((article) => !usedIds.has(article.id))
    .slice(0, LATEST_LIMIT);

  const desks = [];
  for (const region of LOCAL_NEWS_REGIONS) {
    const articles = pickAdsenseSafeArticles(
      await getArticlesByTagSlugAction(region.slug, LOCAL_FETCH, 0),
      LOCAL_LIMIT,
    );
    desks.push({ region, articles });
  }

  return (
    <>
      <TopStoriesPack articles={topStories} />
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8">
        <JoesFriendsPromo variant="banner" />
      </div>
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <LatestStoriesRow articles={latest} />
      </div>
      <LocalDesks desks={desks} />
    </>
  );
}
