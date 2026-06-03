"use client";

import { useEffect, useState } from "react";
import { AdvertisementSlot } from "@/components/ads/advertisement-slot";

const HOMEPAGE_MOBILE_AD_SLOT = "8465535761";
const MOBILE_MAX_WIDTH_QUERY = "(max-width: 1023px)";

export function HomepageMobileAd() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MAX_WIDTH_QUERY);

    const update = () => setShowAd(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!showAd) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6 lg:px-8">
      <AdvertisementSlot
        slot={HOMEPAGE_MOBILE_AD_SLOT}
        minHeightClassName="min-h-[100px]"
      />
    </div>
  );
}
