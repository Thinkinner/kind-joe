import BigArticleCard from "@/components/cards/big-article-card";
import SmallArticleCard from "@/components/cards/small-article-card";

export type Article = {
  id: string | number;
  title: string;
  category?: string;
  imageSrc?: string;
  href?: string;
  date?: string;
  readTime?: string;
  featured?: boolean;
};

export type LatestGridProps = {
  featured?: Article;
  articles: Article[];
};

export default function LatestGrid({ featured, articles }: LatestGridProps) {
  const list = Array.isArray(articles) ? articles : [];
  const [first, ...rest] = list;
  const big = featured ?? first;
  const small = featured ? list : rest;

  return (
    <section className="border-t border-b border-slate-200">
      <div className="max-w-[min(90rem,90%)] w-full mx-auto py-5 border-x p-6">
        <h1 className="font-semibold text-3xl">Goodmorning!</h1>
      </div>

      <div className="border-t border-slate-200">
        <div className="max-w-[min(90rem,90%)] mx-auto border-x">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
            {/* Left: Big article */}
            <div className="px-6 border-b border-slate-200 lg:border-none">
              <div className="py-4 lg:py-8">
                {big ? (
                  <BigArticleCard
                    title={big.title}
                    category={big.category ?? ""}
                    date={big.date ?? ""}
                    readTime={big.readTime ?? ""}
                    imageSrc={
                      big.imageSrc ?? "https://placehold.co/800x450/png"
                    }
                    href={big.href ?? "#"}
                  />
                ) : (
                  <LatestGrid.SkeletonBig />
                )}
              </div>
            </div>

            {/* Right: Small cards */}
            <aside className="px-6 flex flex-col justify-center items-center md:items-stretch">
              <div className="w-full md:pl-8 lg:border-l md:border-slate-200 flex flex-col justify-center">
                <div className="divide-y divide-slate-200">
                  {small.length
                    ? small
                        .slice(0, 4)
                        .map((item) => (
                          <SmallArticleCard
                            key={String(item.id)}
                            title={item.title}
                            category={item.category ?? ""}
                            href={item.href ?? "#"}
                            imageSrc={
                              item.imageSrc ??
                              "https://placehold.co/500x550/png"
                            }
                          />
                        ))
                    : Array.from({ length: 4 }).map((_, i) => (
                        <LatestGrid.SkeletonSmall key={i} />
                      ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

// Inline skeleton helpers
LatestGrid.SkeletonBig = () => <BigArticleCard.Skeleton />;
LatestGrid.SkeletonSmall = () => <SmallArticleCard.Skeleton />;
LatestGrid.Skeleton = () => (
  <section className="border-t border-b border-slate-200">
    <div className="max-w-[min(90rem,90%)] w-full mx-auto py-5 border-x p-6">
      <div className="h-8 w-48 bg-slate-200 rounded" />
    </div>
    <div className="border-t border-slate-200">
      <div className="max-w-[min(90rem,90%)] mx-auto border-x">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
          <div className="px-6 border-b border-slate-200 lg:border-none">
            <div className="py-4 lg:py-8">
              <LatestGrid.SkeletonBig />
            </div>
          </div>
          <aside className="px-6 flex flex-col justify-center items-center md:items-stretch">
            <div className="w-full md:pl-8 lg:border-l md:border-slate-200 flex flex-col justify-center">
              <div className="divide-y divide-slate-200">
                {Array.from({ length: 4 }).map((_, i) => (
                  <LatestGrid.SkeletonSmall key={i} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </section>
);
