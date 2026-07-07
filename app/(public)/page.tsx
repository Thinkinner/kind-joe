import type { Metadata } from "next";
import { FeaturedStoriesCarouselHero } from "@/components/rss-news/featured-stories-carousel";
import { PublisherTrustBar } from "@/components/home/publisher-trust-bar";
import { SectionHeader } from "@/components/home/section-header";
import { TopicPills } from "@/components/home/topic-pills";
import { ArticleList } from "@/components/stories/stories/article-list";
import { HomepageSidebar } from "@/components/home/homepage-sidebar";
import { publicSiteOrigin } from "@/lib/site/public-site-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kind Joe — Original News, Top Stories & Ventura County",
  description:
    "Kind Joe publishes original news, analysis, and local Ventura County coverage. Read our latest stories, top picks, and editorial reporting on kindjoe.com.",
  alternates: {
    canonical: publicSiteOrigin(),
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50">
      <FeaturedStoriesCarouselHero />
      <PublisherTrustBar />

      <main className="w-full px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8 lg:pt-8">
        <SectionHeader
          as="h1"
          eyebrow="Original reporting"
          title="Latest from Kind Joe"
          description="In-depth stories published and hosted on kindjoe.com — updated throughout the day by our editorial team."
          actions={<TopicPills />}
        />

        <div className="grid w-full min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
          <div className="order-2 min-w-0 w-full lg:order-1">
            <ArticleList
              columns={3}
              cardVariant="elevated"
              emptyMessage="New stories are on the way. Check back soon or browse our topic pages."
            />
          </div>

          <aside className="order-1 flex min-w-0 w-full flex-col gap-5 lg:order-2 lg:sticky lg:top-24 lg:gap-6">
            <HomepageSidebar />
          </aside>
        </div>
      </main>

      {/* External sources (RSS headlines) — hidden for now. Restore: ExternalHeadlinesSection in Suspense */}
      {/* <Suspense fallback={null}>
        <ExternalHeadlinesSection />
      </Suspense> */}
    </div>
  );
}
