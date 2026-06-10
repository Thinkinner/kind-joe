import Script from "next/script";

/** Loads adsbygoogle.js — always present for AdSense verification; ad units respect Consent Mode. */
export default function AdsenseScriptLoader({ client }: { client: string }) {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
