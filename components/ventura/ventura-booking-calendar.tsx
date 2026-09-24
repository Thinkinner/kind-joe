"use client";

import { useEffect, useRef, useState } from "react";

const BOOKING_ID = "9Q97d2VJYGnSSL6YmKJ4";
const BOOKING_WIDGET_URL = `https://api.leadconnectorhq.com/widget/booking/${BOOKING_ID}`;
const DEFAULT_HEIGHT = 1100;

type VenturaBookingCalendarProps = {
  className?: string;
  minHeight?: number;
};

/**
 * Do not load link.msgsndr.com/js/form_embed.js here.
 * That script hides booking iframes (display:none) until it gets an
 * iframeLoaded postMessage — in Next.js that message is often missed,
 * so the calendar flashes then disappears.
 */
export function VenturaBookingCalendar({
  className = "",
  minHeight = DEFAULT_HEIGHT,
}: VenturaBookingCalendarProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const origin = event.origin || "";
      if (
        !origin.includes("leadconnectorhq.com") &&
        !origin.includes("msgsndr.com") &&
        !origin.includes("gohighlevel.com")
      ) {
        return;
      }

      const data = event.data;
      let nextHeight: number | null = null;

      if (typeof data === "number" && data > 100) {
        nextHeight = data;
      } else if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data) as {
            height?: number;
            type?: string;
          };
          if (typeof parsed?.height === "number" && parsed.height > 100) {
            nextHeight = parsed.height;
          }
        } catch {
          const match = data.match(/(\d{3,4})/);
          if (match) nextHeight = Number(match[1]);
        }
      } else if (data && typeof data === "object") {
        const heightValue = (data as { height?: number }).height;
        if (typeof heightValue === "number" && heightValue > 100) {
          nextHeight = heightValue;
        }
      }

      if (nextHeight) {
        setHeight(Math.max(minHeight, nextHeight));
      }

      // If the GHL script (or widget) tried to hide us, force visible.
      const frame = iframeRef.current;
      if (frame) {
        frame.style.display = "block";
        frame.style.visibility = "visible";
        frame.style.opacity = "1";
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [minHeight]);

  return (
    <div className={`w-full bg-white ${className}`}>
      <iframe
        ref={iframeRef}
        src={BOOKING_WIDGET_URL}
        title="Book a Ventura business promo call"
        id={`booking_${BOOKING_ID}`}
        style={{
          width: "100%",
          height: `${height}px`,
          border: "none",
          display: "block",
          visibility: "visible",
          opacity: 1,
          background: "#fff",
        }}
        allow="camera; microphone; autoplay; encrypted-media; fullscreen; display-capture"
      />
    </div>
  );
}
