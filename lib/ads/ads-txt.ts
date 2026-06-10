import { ADSENSE_ADS_TXT_CERT, ADSENSE_PUBLISHER_ID } from "@/lib/ads/ads-config";

/** Single source of truth — keep in sync with public/ads.txt */
export const ADS_TXT_LINE = `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, ${ADSENSE_ADS_TXT_CERT}`;

export const ADS_TXT_BODY = `${ADS_TXT_LINE}\n`;

export function adsTxtHeaders(): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };
}
