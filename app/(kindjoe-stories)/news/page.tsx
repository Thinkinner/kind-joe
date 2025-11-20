// app/page.tsx
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { ArticleList } from "@/components/stories/stories/article-list";
import { SocialWidget } from "@/components/ventura-county/social-widget";
import { RssStocksTicker } from "@/components/rss-news/rss-stock-ticker";
import { getStocksFromFinnhub } from "@/lib/stocks";
const stocks = await getStocksFromFinnhub();

export default function HomePage() {
  return (
    <>
      <FeaturedStoriesCarouselHero />

      {/* Main Container */}
      <main className="mx-auto px-5 py-5">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-black text-xl md:text-3xl font-bold ">
            Live Stocks Chart
          </div>
          <div className="text-blue-700 text-xs md:text-base font-bold ">
            AS OF TODAY
          </div>
        </div>
        <RssStocksTicker stocks={stocks} />
        <hr />
        {/* Title above both columns */}
        <h1 className="text-black text-xl md:text-3xl font-bold mt-6 mb-6 " >Latest Kindjoe Articles</h1>

        {/* Flex Row Wrapper */}
        <div className="flex flex-col lg:flex-row gap-8 ">

          {/* Left Column (Articles) */}
          <div className="flex-1 min-w-0">
            <ArticleList />
          </div>

          {/* Right Column (Sidebar) */}
          <aside className="w-full lg:w-[35%] xl:w-[30%] lg:max-w-[420px] shrink-0">
            <div className="flex flex-col gap-8">
              <SocialWidget />
            </div>
          </aside>

        </div>
      </main>
    </>
  );
}