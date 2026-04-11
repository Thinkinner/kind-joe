"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdsenseUnitProps = {
  slot: string;
  className?: string;
  minHeightClassName?: string;
  label?: string;
};

export default function AdsenseUnit({
  slot,
  className,
  minHeightClassName = "min-h-[120px]",
  label = "Sponsored",
}: AdsenseUnitProps) {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const shouldRenderPreview = !adClient || !slot;

  useEffect(() => {
    if (shouldRenderPreview) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Avoid crashing the page if AdSense has not finished bootstrapping yet.
    }
  }, [shouldRenderPreview]);

  if (shouldRenderPreview) {
    return (
      <div
        className={`rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-4 py-6 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 ${minHeightClassName} ${className ?? ""}`}
      >
        {label} preview
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={adClient}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
