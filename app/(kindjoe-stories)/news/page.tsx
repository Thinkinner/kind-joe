// app/page.tsx
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { ArticleList } from "@/components/stories/stories/article-list";
import { SocialWidget } from "@/components/ventura-county/social-widget";

export default function HomePage() {
  return (
    <>
      <FeaturedStoriesCarouselHero />

      {/* Main Container */}
      <main className="mx-auto px-4 py-8">

        {/* Title above both columns */}
        <h1 className="text-2xl font-bold mb-6">Latest Articles</h1>

        {/* Flex Row Wrapper */}
        <div className="flex flex-col lg:flex-row gap-8">

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