import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/types/article";

import HeroFeature from "./hero-feature";
import RailItem from "./rail-item";
import StoryCard from "./story-card";

export type LatestGridProps = {
  featured?: Article;
  articles: Article[];
  heading?: string;
  subheading?: string;
};

export default function LatestGrid({
  featured,
  articles,
  heading = "Today on The Journal",
  subheading = "The most exclusive and latest stories",
}: LatestGridProps) {
  const list = Array.isArray(articles) ? articles : [];
  const [first, ...rest] = list;
  const big = featured ?? first;
  const smallRail = (featured ? list : rest).slice(0, 5);
  const moreStories = (featured ? list : rest).slice(5, 17);

  return (
    <section className="border-y border-slate-200 dark:border-slate-800">
      {/* HERO + RIGHT RAIL */}
      <div className="border-top border-slate-200 dark:border-slate-800">
        <Container className="py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              {big ? <HeroFeature article={big} /> : <HeroFeature.Skeleton />}
            </div>
            <aside className="xl:col-span-1">
              <RightRail articles={smallRail} />
            </aside>
          </div>
        </Container>
      </div>

      {/* MORE STORIES GRID */}
      <div className="border-t border-slate-200 dark:border-slate-800">
        <Container className="py-8">
          <h2 className="text-xl font-semibold tracking-tight mb-4">
            More stories
          </h2>
          {moreStories.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {moreStories.map((a) => (
                <li key={String(a.id)}>
                  <StoryCard article={a} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <StoryCard.Skeleton key={i} />
              ))}
            </div>
          )}
        </Container>
      </div>
    </section>
  );
}

/* ------------------------------ RightRail ------------------------------- */
function RightRail({ articles }: { articles: Article[] }) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="sr-only">Latest</h2>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {articles?.length
          ? articles.map((a) => <RailItem key={String(a.id)} article={a} />)
          : Array.from({ length: 5 }).map((_, i) => (
              <RailItem.Skeleton key={i} />
            ))}
      </div>
    </div>
  );
}

/* ------------------------------ Utilities ------------------------------- */
function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-w-[min(90rem,90%)] w-full mx-auto border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}



/* ------------------------------ Skeletons ------------------------------- */
LatestGrid.Skeleton = function LatestGridSkeleton() {
  return (
    <section className="border-y border-slate-200 dark:border-slate-800">
      <Container className="py-8">
        <div className="space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      </Container>
      <div className="border-t border-slate-200 dark:border-slate-800">
        <Container className="py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
                <Skeleton className="w-full h-full" />
              </div>
            </div>
            <div className="xl:col-span-1 space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b last:border-b-0">
                  <div className="p-4 flex items-start gap-4">
                    <div className="relative w-32 sm:w-36 aspect-video overflow-hidden rounded-md">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-20 rounded" />
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800">
        <Container className="py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl">
                <div className="relative w-full aspect-[16/10]">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
};

// Optional backward compatibility for skeleton parts
LatestGrid.SkeletonBig = () => (
  <div className="relative aspect-[16/9]">
    <Skeleton className="w-full h-full" />
  </div>
);

LatestGrid.SkeletonSmall = () => (
  <div className="p-4 flex items-start gap-4 border-b last:border-b-0">
    <div className="relative w-32 sm:w-36 aspect-video overflow-hidden rounded-md">
      <Skeleton className="w-full h-full" />
    </div>
    <div className="min-w-0 flex-1">
      <Skeleton className="h-4 w-20 rounded" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  </div>
);
