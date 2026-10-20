import type { Metadata } from "next";
import Link from "next/link";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { ArticleList } from "@/components/stories/stories/article-list";
import { SocialWidget } from "@/components/ventura-county/social-widget";
import { NAV_LOCAL_LINKS } from "@/lib/nav/public-links";
import { publicSiteUrl } from "@/lib/site/public-site-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kindjoe News • Kind Joe",
  description:
    "Latest Kindjoe News — original reporting and analysis from Kind Joe.",
  alternates: { canonical: publicSiteUrl("/news") },
};

export default function KindjoeNewsPage() {
  return (
    <main className="mx-auto px-5 py-5">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold font-[Poppins] text-black md:text-3xl">
            Kindjoe News
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Latest stories from Kind Joe.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {NAV_LOCAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-200 hover:text-red-700"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <JoesFriendsPromo variant="compact" className="mb-6 lg:hidden" />

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <ArticleList emptyMessage="No Kindjoe stories yet. Check back soon." />
        </div>
        <aside className="hidden w-full shrink-0 lg:sticky lg:top-24 lg:block lg:w-[35%] lg:max-w-[420px] xl:w-[30%]">
          <div className="flex flex-col gap-8">
            <JoesFriendsPromo />
            <SocialWidget />
          </div>
        </aside>
      </div>
    </main>
  );
}
