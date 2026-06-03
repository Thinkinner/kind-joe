import { Skeleton } from "@/components/ui/skeleton";

/** Shown only while Finnhub data loads — section title is already visible above. */
export function StocksTickerSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full overflow-hidden py-1" aria-hidden>
      <Skeleton
        className={`w-full max-w-full rounded-md bg-white/10 ${compact ? "h-6" : "h-11 rounded-lg bg-neutral-200/90"}`}
      />
    </div>
  );
}

/** Shown only while RSS articles load — no fake page headings, only card placeholders. */
export function NewsArticleGridSkeleton() {
  return (
    <div
      className="grid w-full min-w-0 max-w-full gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr]"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="space-y-3">
          <Skeleton className="aspect-[16/10] w-full rounded-xl bg-neutral-200/90" />
          <Skeleton className="h-5 w-[90%] max-w-full bg-neutral-200/90" />
          <Skeleton className="h-4 w-[65%] bg-neutral-200/80" />
        </div>
      ))}
    </div>
  );
}
