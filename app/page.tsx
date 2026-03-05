// app/news/page.tsx
import Left_Image from "@/components/rss-news/left-image";
import Right_Image from "@/components/rss-news/right-image";
import Main_Image from "@/components/rss-news/main-image";
import {
  getRenderableArticles,
  toCardPayloads,
  pickHeroAndGroups,
} from "@/lib/rss-news/news";
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";
import { RssStocksTicker } from "@/components/rss-news/rss-stock-ticker";
import { getStocksFromFinnhub } from "@/lib/stocks";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

export const revalidate = 300;

export default async function NewsPage() {
  // Fetch & score
  const articles = await getRenderableArticles(36);
  const { hero, rest } = pickHeroAndGroups(articles);

  // Build groups for the remaining items using your existing grouping logic
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

  // Prepare a hero group mapped to the CardGroup shape your components expect
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

  const stocks = await getStocksFromFinnhub();

  return (
    <>
      <Navbar />
      <div>
        <KindJoeModal />
        <div>
          <FeaturedStoriesCarouselHero />
          <div className="flex flex-col gap-3 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="text-black text-xl md:text-3xl font-bold font-[Poppins]">
                Live Stocks Chart
              </div>
              <div className="text-blue-700 text-xs md:text-base font-bold font-[Poppins]">
                AS OF TODAY
              </div>
            </div>
            <RssStocksTicker stocks={stocks} />
          </div>
          <hr />
          <div className="flex flex-col gap-8 flex-grow md:grid md:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr] md:gap-x-0 md:gap-y-0 w-full">
            {/* Left column */}
            <div className="order-2 md:order-1 flex flex-col gap-6 items-stretch md:border-r md:border-neutral-300 md:pr-6">
              {groupedRest[0] && <Left_Image data={groupedRest[0]} />}
              {groupedRest[1] && <Right_Image data={groupedRest[1]} />}
              {groupedRest[2] && <Main_Image data={groupedRest[2]} />}
            </div>

            {/* Middle column — now uses the single best-quality hero */}
            <div className="order-1 md:order-2 flex flex-col gap-6 items-stretch md:border-r md:border-neutral-300 md:px-6">
              {heroGroup && <Main_Image data={heroGroup} />}
              {groupedRest[3] && <Right_Image data={groupedRest[3]} />}
              {groupedRest[4] && <Left_Image data={groupedRest[4]} />}
            </div>

            {/* Right column */}
            <div className="order-3 md:order-3 flex flex-col gap-6 items-stretch md:pl-6">
              {groupedRest[5] && <Left_Image data={groupedRest[5]} />}
              {groupedRest[6] && <Main_Image data={groupedRest[6]} />}
              {groupedRest[7] && <Right_Image data={groupedRest[7]} />}
            </div>
          </div>
        </div>
        <hr />
        <br />
      </div>
      <Footer />
    </>
  );
}
