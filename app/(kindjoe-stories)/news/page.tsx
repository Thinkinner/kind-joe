// app/page.tsx
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { ArticleList } from "@/components/stories/stories/article-list";
import { SocialWidget } from "@/components/ventura-county/social-widget";
import { RssStocksTicker } from "@/components/rss-news/rss-stock-ticker";
import { getStocksFromFinnhub } from "@/lib/stocks";

export default async function HomePage() {
  const stocks = await getStocksFromFinnhub();

  return (
    <>
      <FeaturedStoriesCarouselHero />

      {/* Main Container */}
      <main className="mx-auto px-5 py-5">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-black text-xl md:text-3xl font-bold font-[Poppins]">
            Live Stocks Chart
          </div>
          <div className="text-blue-700 text-xs md:text-base font-bold font-[Poppins]">
            AS OF TODAY
          </div>
        </div>
        <RssStocksTicker stocks={stocks} />
        <hr className="my-6 border-slate-200" />

        {/* Title above both columns */}
        <h1 className="text-black text-xl md:text-3xl font-bold font-[Poppins] mb-6">
          Latest Kindjoe Articles
        </h1>

        {/* Flex Row Wrapper */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {" "}
          {/* 👈 Added items-start */}
          {/* Left Column (Articles) */}
          <div className="flex-1 min-w-0">
            <ArticleList />
          </div>
          {/* Right Column (Sidebar) */}
          <aside className="w-full lg:w-[35%] xl:w-[30%] lg:max-w-[420px] shrink-0 lg:sticky lg:top-24">
            {/* 👆 Added lg:sticky and lg:top-24 */}
            <div className="flex flex-col gap-8">
              <SocialWidget />
              {/* If you add more widgets here, they will all stick together */}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
