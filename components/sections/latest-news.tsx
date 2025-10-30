import SmallArticleCard from "../cards/small-article-card";
import BigArticleCard from "../cards/big-article-card";

export default function LatestGrid() {
  return (
    <section className="border-t border-b border-slate-200">
      {/* grid: 1 col on mobile, 2 on md+ */}
      <div className="max-w-[min(90rem,90%)] w-full mx-auto py-5 border-x p-6">
        <h1 className="font-semibold text-3xl">Goodmorning!</h1>
      </div>
      <div className="border-t  border-slate-200">
        <div className="max-w-[min(90rem,90%)] mx-auto border-x">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
            {/* Left column (big article) */}
            <div className="px-6 border-b border-slate-200 lg:border-none">
              <div className="py-4 lg:py-8">
                <BigArticleCard />
              </div>
            </div>

            {/* Right column (list of small cards) */}
            <aside className="px-6 flex flex-col justify-center items-center md:items-stretch">
              <div className="w-full md:pl-8 lg:border-l md:border-slate-200 flex flex-col justify-center">
                <div className="divide-y divide-slate-200">
                  <SmallArticleCard />
                  <SmallArticleCard />
                  <SmallArticleCard />
                  <SmallArticleCard />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
