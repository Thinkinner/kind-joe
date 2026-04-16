// PUBLIC APP: components/ArticleTracker.tsx
"use client";

import { useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";

function TrackerLogic({ articleId }: { articleId: string }) {
  const searchParams = useSearchParams();
  const hasTracked = useRef(false); // Prevents double-firing in React Strict Mode

  useEffect(() => {
    if (hasTracked.current || !articleId) return;

    const trackView = async () => {
      hasTracked.current = true;
      try {
        await fetch("/api/articles/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId,
            utmSource: searchParams.get("utm_source"),
            utmMedium: searchParams.get("utm_medium"),
            utmCampaign: searchParams.get("utm_campaign"),
            // Important: Send the browser's document referrer (Google, FB, etc.)
            referrer: document.referrer,
          }),
          keepalive: true,
        });
      } catch (error) {
        console.error("Failed to send tracking data", error);
      }
    };

    // Give the page a moment to load before tracking (optional, but good for performance)
    const timeout = setTimeout(trackView, 1000);
    return () => clearTimeout(timeout);
  }, [articleId, searchParams]);

  return null;
}

export default function ArticleTracker({ articleId }: { articleId: string }) {
  return (
    <Suspense fallback={null}>
      <TrackerLogic articleId={articleId} />
    </Suspense>
  );
}