"use client";

import AdsenseUnit from "@/components/ads/adsense-unit";

type AdvertisementSlotProps = {
  slot: string;
  minHeightClassName?: string;
  className?: string;
};

export function AdvertisementSlot({
  slot,
  minHeightClassName = "min-h-[280px]",
  className,
}: AdvertisementSlotProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm ${className ?? ""}`}
      aria-label="Advertisement"
    >
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
        Advertisement
      </p>
      <AdsenseUnit
        slot={slot}
        label="Advertisement"
        minHeightClassName={minHeightClassName}
        centered
      />
    </section>
  );
}
