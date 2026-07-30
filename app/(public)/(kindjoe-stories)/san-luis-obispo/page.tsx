import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/section-header";
import { ArticleList } from "@/components/stories/stories/article-list";
import { ensureLocalNewsTags } from "@/lib/actions/articles";
import { getLocalNewsRegionBySlug } from "@/lib/local-news/regions";
import { publicSiteUrl } from "@/lib/site/public-site-url";

export const revalidate = 300;

const REGION = getLocalNewsRegionBySlug("san-luis-obispo")!;

export const metadata: Metadata = {
  title: `${REGION.name} • Kind Joe`,
  description: REGION.description,
  alternates: { canonical: publicSiteUrl(REGION.href) },
};

export default async function SanLuisObispoPage() {
  await ensureLocalNewsTags();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader
          as="h1"
          eyebrow={REGION.eyebrow}
          title={REGION.name}
          description={REGION.description}
        />
        <ArticleList
          tagSlug={REGION.slug}
          columns={3}
          cardVariant="elevated"
          emptyMessage={`No ${REGION.name} stories yet. Tag articles with "${REGION.slug}" to show them here.`}
        />
      </main>
    </div>
  );
}
