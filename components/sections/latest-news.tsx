// Bridge section that renders the modern grid
import type { Article } from "@/types/article";
import LatestGrid from "@/components/news/latest-grid";
import { Skeleton } from "@/components/ui/skeleton";

export type LatestNewsProps = {
  featured?: Article;
  articles: Article[];
  heading?: string;
  subheading?: string;
  topics?: string[];
};

export default function LatestNews({
  featured,
  articles,
  heading = "Today on The Journal",
  subheading = "Handpicked stories, updated live",
}: LatestNewsProps) {
  return (
    <LatestGrid
      featured={featured}
      articles={articles}
      heading={heading}
      subheading={subheading}
    />
  );
}

// Nice skeleton that mirrors the grid
LatestNews.Skeleton = function LatestNewsSkeleton() {
  return (
    <section className=" border-slate-200 dark:border-slate-800">
      <div className="max-w-[min(90rem,90%)] w-full mx-auto border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>

      <div className=" border-slate-200 dark:border-slate-800">
        <div className="max-w-[min(90rem,90%)] w-full mx-auto border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
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

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </div>
      </div>
    </section>
  );
};
