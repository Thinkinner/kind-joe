"use client";

import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { ArticleList } from "@/components/stories/stories/article-list";
import { SocialWidget } from "@/components/ventura-county/social-widget";
import type { TopicSlug } from "@/lib/content/topics";

type TopicPageShellProps = {
  topic: TopicSlug;
  title: string;
  description: string;
};

export function TopicPageShell({ topic, title, description }: TopicPageShellProps) {
  return (
    <main className="mx-auto px-5 py-5">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-black text-xl md:text-3xl font-bold font-[Poppins]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">{description}</p>
        </div>
      </div>

      <JoesFriendsPromo variant="compact" className="mb-6 lg:hidden" />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          <ArticleList
            topic={topic}
            emptyMessage={`No ${title.toLowerCase()} stories yet. Check back soon.`}
          />
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
