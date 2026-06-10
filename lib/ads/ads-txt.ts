/** Single source of truth — keep in sync with public/ads.txt */
export const ADSENSE_PUBLISHER_ID = "pub-2956404262281420";

export const ADS_TXT_LINE = `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0`;

export const ADS_TXT_BODY = `${ADS_TXT_LINE}\n`;

export function adsTxtHeaders(): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };
}
