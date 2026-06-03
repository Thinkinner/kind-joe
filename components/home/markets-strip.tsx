import { Suspense } from "react";
import { TrendingUp } from "lucide-react";
import { RssStocksTicker } from "@/components/rss-news/rss-stock-ticker";
import { StocksTickerSkeleton } from "@/components/rss-news/home-page-fallbacks";
import { getStocksFromFinnhub } from "@/lib/stocks";

async function TickerContent() {
  const stocks = await getStocksFromFinnhub();
  return <RssStocksTicker stocks={stocks} variant="dark" />;
}

export function MarketsStrip() {
  return (
    <section
      className="border-t border-white/[0.06] bg-[#0a0a0b]"
      aria-label="Markets snapshot"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-5 lg:px-8">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-white/10 pr-2.5 sm:pr-3">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Markets
          </span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={<StocksTickerSkeleton compact />}>
            <TickerContent />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
