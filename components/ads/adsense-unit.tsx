"use client";

import { useEffect, useRef, useState } from "react";

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
  const adRef = useRef<HTMLModElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (shouldRenderPreview) return;
    setIsCollapsed(false);

    const adElement = adRef.current;
    if (!adElement) return;

    const getAdStatus = () => adElement.getAttribute("data-ad-status");
    const hasRenderedAd = () => getAdStatus() === "filled";
    const isExplicitlyUnfilled = () => getAdStatus() === "unfilled";

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Avoid crashing the page if AdSense has not finished bootstrapping yet.
    }

    const observer = new MutationObserver(() => {
      if (isExplicitlyUnfilled()) {
        setIsCollapsed(true);
        return;
      }
      if (hasRenderedAd()) {
        setIsCollapsed(false);
      }
    });
    observer.observe(adElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const collapseTimer = window.setTimeout(() => {
      if (!hasRenderedAd()) {
        setIsCollapsed(true);
      }
    }, 4500);

    return () => {
      observer.disconnect();
      window.clearTimeout(collapseTimer);
    };
  }, [shouldRenderPreview, resolvedSlot, adClient, adFormat, adLayout, adLayoutKey]);

  if (shouldRenderPreview) {
    return (
      <div
        className={`rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-4 py-6 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 ${minHeightClassName} ${className ?? ""}`}
      >
        {label} preview
      </div>
    );
  }

  if (isCollapsed) {
    return null;
  }

  return (
    <ins
      ref={adRef}
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
