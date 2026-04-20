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
  adFormat?: "auto" | "fluid";
  adLayout?: string;
  adLayoutKey?: string;
  centered?: boolean;
};

export default function AdsenseUnit({
  slot,
  className,
  minHeightClassName = "min-h-[120px]",
  label = "Sponsored",
  adFormat = "auto",
  adLayout,
  adLayoutKey,
  centered = false,
}: AdsenseUnitProps) {
  const isDev = process.env.NODE_ENV !== "production";
  const adClient = isDev ? "ca-pub-3940256099942544" : "ca-pub-2956404262281420";
  const resolvedSlot = isDev ? "6300978111" : slot;
  const shouldRenderPreview = !adClient || !resolvedSlot;

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
      style={{ display: "block", textAlign: centered ? "center" : undefined }}
      data-ad-client={adClient}
      data-ad-slot={resolvedSlot}
      data-ad-layout={adLayout}
      data-ad-format={adFormat}
      data-ad-layout-key={adLayoutKey}
      data-full-width-responsive="true"
      data-adtest={isDev ? "on" : undefined}
    />
  );
}
