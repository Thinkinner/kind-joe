// app/page.tsx
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { ArticleList } from "@/components/stories/stories/article-list";

export default function HomePage() {
  return (
    <>
      <FeaturedStoriesCarouselHero />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Latest Articles</h1>
        <ArticleList />
      </main>
    </>
  );
}
