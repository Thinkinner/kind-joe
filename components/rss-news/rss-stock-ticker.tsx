// components/rss/RssStocksTicker.tsx
import React from "react";
import type { StockItem } from "@/types/rss";

function pctColor(n: number) {
  if (n > 0) return "text-green-700";
  if (n < 0) return "text-red-600";
  return "text-zinc-500";
}

function dotClass(n: number) {
  if (n > 0) {
    return "w-2 h-2 outline outline-[3px] outline-offset-[-1.5px] outline-green-700 rounded-[2px]";
  }
  if (n < 0) {
    return "w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-red-600";
  }
  return "w-2 h-2 rounded-full bg-zinc-400";
}

export function RssStocksTicker({ stocks }: { stocks: StockItem[] }) {
  // duplicate items so the ticker can loop seamlessly
  const looped = [...stocks, ...stocks];

  return (
    <div className="w-full overflow-hidden">
      <div className="ticker-animate">
        {looped.map((s, index) => (
          <div
            key={`${s.label}-${index}`}
            className="flex items-center gap-2 shrink-0 mr-6"
          >
            <div className="text-black text-sm md:text-base font-bold ">
              {s.label}
            </div>

            <div className={dotClass(s.changePct)} />

            <div
              className={`${pctColor(
                s.changePct
              )} text-sm md:text-base font-normal `}
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