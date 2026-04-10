"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SESSION_KEY = "kj_visit_session_id";
const VISITOR_KEY = "kj_visit_visitor_id";
const LAST_SENT_KEY = "kj_visit_last_sent";
const HEARTBEAT_MS = 15000;

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getOrCreateSessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = randomId("sess");
  sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

function getOrCreateVisitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = randomId("vst");
  localStorage.setItem(VISITOR_KEY, next);
  return next;
}

function shouldTrackPath(pathname: string) {
  if (!pathname) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  if (pathname.startsWith("/api/")) return false;
  return true;
}

function sendTrack(payload: {
  sessionId: string;
  visitorId: string;
  path: string;
  query: string | null;
  referrer: string | null;
}) {
  return fetch("/api/track-page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

function TrackerLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) return;

    const query = searchParams.toString();
    const pageKey = `${pathname}${query ? `?${query}` : ""}`;
    const payload = {
      sessionId: getOrCreateSessionId(),
      visitorId: getOrCreateVisitorId(),
      path: pathname,
      query: query || null,
      referrer: document.referrer || null,
    };
    const startedAt = Date.now();

    const lastSent = sessionStorage.getItem(LAST_SENT_KEY);
    if (lastSent !== pageKey) {
      sessionStorage.setItem(LAST_SENT_KEY, pageKey);
      void sendTrack(payload).catch(() => {
        // Tracking should never break the page experience.
      });
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void sendTrack(payload).catch(() => {
        // Tracking should never break the page experience.
      });
    }, HEARTBEAT_MS);

    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      void sendTrack(payload).catch(() => {
        // Tracking should never break the page experience.
      });
    };

    document.addEventListener("visibilitychange", onHidden);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      if (Date.now() - startedAt >= 1500) {
        void sendTrack(payload).catch(() => {
          // Tracking should never break the page experience.
        });
      }
    };
  }, [pathname, searchParams]);

  return null;
}

export default function VisitorJourneyTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerLogic />
    </Suspense>
  );
}
