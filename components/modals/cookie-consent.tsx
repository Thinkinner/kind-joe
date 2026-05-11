"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie as CookieIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  COOKIE_DISMISSED_SESSION_KEY,
} from "@/lib/consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type CookieConsentProps = {
  cookieName?: string;
  policyHref?: string;
  className?: string;
  delayMs?: number;
};

export default function CookieConsent({
  cookieName = COOKIE_CONSENT_KEY,
  policyHref = "/privacy-policy",
  className,
  delayMs = 2000, // Reduced delay for better UX
}: CookieConsentProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Check if user has already responded
    const consent = localStorage.getItem(cookieName);
    const dismissedSession = sessionStorage.getItem(COOKIE_DISMISSED_SESSION_KEY);

    if (!consent && !dismissedSession) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [cookieName, delayMs]);

  const acceptCookies = () => {
    // Save to localStorage so it NEVER shows again
    localStorage.setItem(cookieName, "accepted");
    // Also set actual cookie for server-side if needed
    document.cookie = `${cookieName}=accepted; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
    sessionStorage.removeItem(COOKIE_DISMISSED_SESSION_KEY);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { status: "accepted" } }),
    );
    window.gtag?.("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
    setIsVisible(false);
  };

  const declineCookies = () => {
    // Persist declined preference to avoid re-prompting on every page load.
    localStorage.setItem(cookieName, "rejected");
    document.cookie = `${cookieName}=rejected; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
    sessionStorage.setItem(COOKIE_DISMISSED_SESSION_KEY, "1");
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { status: "rejected" } }),
    );
    window.gtag?.("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-10 duration-700",
        className
      )}
    >
      <div className="bg-background border shadow-2xl rounded-2xl overflow-hidden">
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <CookieIcon className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground tracking-tight">Cookie Policy</h3>
                <button 
                  onClick={declineCookies}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use cookies to enhance your experience. By continuing, you agree to our{" "}
                <Link href={policyHref} className="text-indigo-600 hover:underline font-medium">
                  Privacy Policy
                </Link>.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={acceptCookies} 
                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all active:scale-95"
                >
                  Allow cookies
                </Button>
                <Button 
                  variant="outline" 
                  onClick={declineCookies}
                  className="w-full sm:w-auto text-xs"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}