/** Google AdSense — single source of truth for publisher ID, script, and ads.txt */
export const ADSENSE_CLIENT = "ca-pub-2956404262281420";
export const ADSENSE_PUBLISHER_ID = "pub-2956404262281420";
export const ADSENSE_ADS_TXT_CERT = "f08c47fec0942fa0";

/** Google test client/slot — local dev only */
export const ADSENSE_TEST_CLIENT = "ca-pub-3940256099942544";
export const ADSENSE_TEST_SLOT = "6300978111";

export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

export function resolveAdsenseClient(isProduction = process.env.NODE_ENV === "production") {
  return isProduction ? ADSENSE_CLIENT : ADSENSE_TEST_CLIENT;
}
