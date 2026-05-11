"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  type CookieConsentStatus,
} from "@/lib/consent";

function readConsent(): CookieConsentStatus {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export default function AdsenseScriptLoader({ client }: { client: string }) {
  const [consent, setConsent] = useState<CookieConsentStatus>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onConsentUpdate = () => setConsent(readConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentUpdate as EventListener);
    return () =>
      window.removeEventListener(
        COOKIE_CONSENT_EVENT,
        onConsentUpdate as EventListener,
      );
  }, []);

  if (consent !== "accepted") return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
