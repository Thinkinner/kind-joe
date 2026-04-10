import { Suspense } from "react";
import Left_Image from "@/components/rss-news/left-image";
import Right_Image from "@/components/rss-news/right-image";
import Main_Image from "@/components/rss-news/main-image";
import {
  NewsArticleGridSkeleton,
  StocksTickerSkeleton,
} from "@/components/rss-news/home-page-fallbacks";
import {
  getRenderableArticles,
  toCardPayloads,
  pickHeroAndGroups,
} from "@/lib/rss-news/news";
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { RssStocksTicker } from "@/components/rss-news/rss-stock-ticker";
import { getStocksFromFinnhub } from "@/lib/stocks";

export const revalidate = 300;

async function HomeStocksTickerAsync() {
  const stocks = await getStocksFromFinnhub();
  return <RssStocksTicker stocks={stocks} />;
}

async function HomeArticleGridAsync() {
  const articles = await getRenderableArticles(36);
  const { hero, rest } = pickHeroAndGroups(articles);

  const groupedRest = toCardPayloads(rest)
    .map((g) => ({
      main: {
        title: g.main?.modifiedTitle || g.main?.title || "",
        href: g.main?.link || "#",
        imageUrl: g.main?.imageUrl || null,
        sourceName: g.main?.source.name || "Unknown",
      },
      links: g.links.slice(0, 3).map((l) => ({
        title: l.modifiedTitle || l.title,
        href: l.link,
      })),
    }))
    .slice(0, 9);

  const heroGroup = hero
    ? {
        main: {
          title: hero.modifiedTitle || hero.title,
          href: hero.link || "#",
          imageUrl: hero.imageUrl || null,
          sourceName: hero.source.name || "Unknown",
        },
        links: groupedRest[0]?.links ?? [],
      }
    : undefined;

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-0 md:gap-y-0 lg:grid-cols-[1fr_1.5fr_1fr]">
      <div className="order-2 flex min-w-0 flex-col gap-6 items-stretch md:order-1 md:border-r md:border-neutral-300 md:pr-6">
        {groupedRest[0] && <Left_Image data={groupedRest[0]} />}
        {groupedRest[1] && <Right_Image data={groupedRest[1]} />}
        {groupedRest[2] && <Main_Image data={groupedRest[2]} />}
      </div>

      <div className="order-1 flex min-w-0 flex-col gap-6 items-stretch md:order-2 md:border-r md:border-neutral-300 md:px-6">
        {heroGroup && <Main_Image data={heroGroup} />}
        {groupedRest[3] && <Right_Image data={groupedRest[3]} />}
        {groupedRest[4] && <Left_Image data={groupedRest[4]} />}
      </div>

      <div className="order-3 flex min-w-0 flex-col gap-6 items-stretch md:pl-6">
        {groupedRest[5] && <Left_Image data={groupedRest[5]} />}
        {groupedRest[6] && <Main_Image data={groupedRest[6]} />}
        {groupedRest[7] && <Right_Image data={groupedRest[7]} />}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <div>
        <div>
          <FeaturedStoriesCarouselHero />
          <div className="flex min-w-0 flex-col gap-3 overflow-x-clip px-5 py-5">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="font-[Poppins] text-xl font-bold text-black md:text-3xl">
                Live Stocks Chart
              </div>
              <div className="font-[Poppins] text-xs font-bold text-blue-700 md:text-base">
                AS OF TODAY
              </div>
            </div>
            <Suspense fallback={<StocksTickerSkeleton />}>
              <HomeStocksTickerAsync />
            </Suspense>
          </div>
          <hr />
          <Suspense fallback={<NewsArticleGridSkeleton />}>
            <HomeArticleGridAsync />
          </Suspense>
        </div>
        <hr />
        <br />
      </div>
    </>
  );
}
