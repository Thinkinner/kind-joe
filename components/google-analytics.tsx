"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  type CookieConsentStatus,
} from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): CookieConsentStatus {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

function GoogleAnalyticsLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    if (!GA_ID || consent !== "accepted") return;
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "");

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("config", GA_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, consent]);

  if (!GA_ID || consent !== "accepted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
          });
          gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted'
          });
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsLogic />
    </Suspense>
  );
}
