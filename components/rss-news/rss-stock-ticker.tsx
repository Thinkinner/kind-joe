// components/rss/RssStocksTicker.tsx
import type { StockItem } from "@/types/rss";

function dotClass(n: number) {
  if (n > 0) {
    return "w-2 h-2 outline outline-[3px] outline-offset-[-1.5px] outline-green-700 rounded-[2px]";
  }
  if (n < 0) {
    return "w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-red-600";
  }
  return "w-2 h-2 rounded-full bg-zinc-400";
}

export function RssStocksTicker({
  stocks,
  variant = "light",
}: {
  stocks: StockItem[];
  variant?: "light" | "dark";
}) {
  const looped = [...stocks, ...stocks];
  const labelClass =
    variant === "dark"
      ? "text-xs font-bold font-[Poppins] text-white sm:text-sm md:text-base"
      : "text-black text-sm md:text-base font-bold font-[Poppins]";
  const pctNeutral = variant === "dark" ? "text-slate-400" : "text-zinc-500";
  const pctPositive = variant === "dark" ? "text-emerald-400" : "text-green-700";
  const pctNegative = variant === "dark" ? "text-red-400" : "text-red-600";

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-x-clip">
      <div className="ticker-animate">
        {looped.map((s, index) => (
          <div
            key={`${s.label}-${index}`}
            className="mr-5 flex shrink-0 items-center gap-2 sm:mr-6"
          >
            <div className={labelClass}>{s.label}</div>

            <div className={dotClass(s.changePct)} />

            <div
              className={`${s.changePct === 0 ? pctNeutral : s.changePct > 0 ? pctPositive : pctNegative} text-xs font-normal font-[Poppins] sm:text-sm md:text-base`}
            >
              {s.changePct > 0 ? "+" : ""}
              {s.changePct.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}