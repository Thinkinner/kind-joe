"use client";

import { useCallback, useEffect } from "react";
import Script from "next/script";
import Link from "next/link";
import { MessageCircle, ExternalLink } from "lucide-react";
import { COUNCIL_TEA_API_URL } from "@/lib/council-tea";

const VENTURA_ORANGE = "#ea580c";
const STYLE_OVERRIDE_ID = "kind-joe-council-tea-overrides";

/** Fix native select/input dark-mode styling inside the Council Tea shadow DOM. */
function applyCouncilTeaStyleOverrides() {
  const host = document.getElementById("council-tea-widget");
  const shadow = host?.shadowRoot;
  if (!shadow || shadow.getElementById(STYLE_OVERRIDE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_OVERRIDE_ID;
  style.textContent = `
    .ct-city-select,
    .ct-meeting-select {
      background: #fff !important;
      color: #111827 !important;
      border: 1px solid rgba(255, 255, 255, 0.45) !important;
      color-scheme: light;
    }
    .ct-city-select option,
    .ct-meeting-select option {
      background: #fff;
      color: #111827;
    }
    .ct-input {
      background: #fff !important;
      color: #111827 !important;
      color-scheme: light;
    }
    .ct-input::placeholder {
      color: #9ca3af;
    }
  `;
  shadow.appendChild(style);
}

interface CouncilTeaEmbedProps {
  title?: string;
  variant?: "sidebar" | "page";
}

export function CouncilTeaEmbed({
  title = "Council Tea",
  variant = "sidebar",
}: CouncilTeaEmbedProps) {
  const handleWidgetLoad = useCallback(() => {
    applyCouncilTeaStyleOverrides();
  }, []);

  useEffect(() => {
    applyCouncilTeaStyleOverrides();

    const observer = new MutationObserver(() => {
      applyCouncilTeaStyleOverrides();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const scriptProps = {
    id: "council-tea-widget",
    src: `${COUNCIL_TEA_API_URL}/embed/widget.js`,
    "data-api-url": COUNCIL_TEA_API_URL,
    "data-title": title,
    "data-subtitle": "Ask about Ventura County council meetings",
    "data-color": VENTURA_ORANGE,
    strategy: (variant === "page" ? "afterInteractive" : "lazyOnload") as
      | "afterInteractive"
      | "lazyOnload",
    onLoad: handleWidgetLoad,
  };

  if (variant === "page") {
    return (
      <>
        <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
            <MessageCircle className="h-7 w-7 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Your meeting Q&amp;A assistant
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
            Click the orange chat button in the bottom-right corner to pick
            your city or county and ask about recent council hearings — votes,
            budgets, and what passed or failed.
          </p>
        </div>
        <Script {...scriptProps} />
      </>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="border-b border-orange-50 bg-gradient-to-br from-orange-600 to-orange-500 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 shrink-0" />
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
        </div>
        <p className="mt-1.5 text-sm text-orange-50/90">
          Ask questions about Ventura County council meetings and get answers
          from official transcripts.
        </p>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-neutral-600">
          Use the chat button in the corner, or open the full experience on
          our dedicated page.
        </p>
        <Link
          href="/council-tea"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
        >
          Open Council Tea
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <Script {...scriptProps} />
    </section>
  );
}

export { applyCouncilTeaStyleOverrides };
