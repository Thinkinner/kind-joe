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
  const isDev = process.env.NODE_ENV !== "production";
  // In local/dev, force Google's official test ad unit so rendering can be verified
  // without requiring live publisher inventory or domain approval.
  const resolvedClient = isDev
    ? "ca-pub-3940256099942544"
    : (adClient ?? "");
  const resolvedSlot = isDev ? "6300978111" : slot;
  const shouldRenderPreview = !resolvedClient || !resolvedSlot;

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
      data-ad-client={resolvedClient}
      data-ad-slot={resolvedSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-adtest={isDev ? "on" : undefined}
    />
  );
}
