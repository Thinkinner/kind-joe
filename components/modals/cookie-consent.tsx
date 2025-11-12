"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Cookie as CookieIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type CookieConsentProps = {
  initiallyConsented?: boolean;
  cookieName?: string;
  policyHref?: string;
  termsHref?: string;
  className?: string;
  /** delay before showing modal (ms). default: 10_000 */
  delayMs?: number;
};

const ONE_YEAR = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string, maxAgeSeconds = ONE_YEAR) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function CookieConsentModal({
  initiallyConsented,
  cookieName = "cookie_consent",
  policyHref = "/privacy-policy",
  termsHref = "/terms",
  className,
  delayMs = 10_000,
}: CookieConsentProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // decide if we should show at all
    const alreadyAccepted =
      initiallyConsented || getCookie(cookieName) === "accepted";
    const dismissedThisSession =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("cookie_consent_dismissed") === "1";

    if (alreadyAccepted || dismissedThisSession) {
      setOpen(false);
      return;
    }

    // show after delay
    const t = window.setTimeout(() => {
      // re-check at show time in case user accepted/dismissed meanwhile
      const acceptedNow = getCookie(cookieName) === "accepted";
      const dismissedNow =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("cookie_consent_dismissed") === "1";
      if (!acceptedNow && !dismissedNow) setOpen(true);
    }, Math.max(0, delayMs));

    return () => window.clearTimeout(t);
  }, [initiallyConsented, cookieName, delayMs]);

  const allow = () => {
    setCookie(cookieName, "accepted");
    setOpen(false);
  };

  const dismissForSession = () => {
    try {
      sessionStorage.setItem("cookie_consent_dismissed", "1");
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby="cookie-desc"
        className={cn(
          "max-w-lg rounded-2xl p-0 overflow-hidden border sm:max-w-xl",
          className
        )}
      >
        <div className="relative">
          <div className="h-1 w-full bg-gradient-to-r from-red-800 via-blue-600 to-pink-500" />

          <div className="p-6">
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10">
                  <CookieIcon className="h-5 w-5 text-indigo-600" />
                </span>
                <div>
                  <DialogTitle className="text-xl">We use cookies</DialogTitle>
                  <DialogDescription id="cookie-desc" className="mt-1">
                    Cookies help us personalize content, measure performance,
                    and improve your reading experience.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ul className="mb-4 ml-1 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Essential cookies keep the site secure and reliable.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Analytics help us understand what content readers love.</span>
              </li>
            </ul>

            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              By clicking <span className="font-medium text-foreground">Allow cookies</span>, you agree to our{" "}
              <Link href={policyHref} className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href={termsHref} className="underline underline-offset-4 hover:text-foreground">
                Terms of Service
              </Link>.
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={dismissForSession} className="sm:mr-2 cursor-pointer">
              Maybe later
            </Button>
            <Button onClick={allow} className="cursor-pointer">Allow cookies</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
