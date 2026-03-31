import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BreakingLiveNewsCtaProps = {
  className?: string;
  /** Compact pill for nav / profile rows (e.g. posts page header). */
  variant?: "default" | "inline";
};

/** Set true when Kind Joe Watch is public again (see middleware + navbar). */
const KINDJOE_WATCH_CTA_ENABLED = false;

export default function BreakingLiveNewsCta({
  className,
  variant = "default",
}: BreakingLiveNewsCtaProps) {
  if (!KINDJOE_WATCH_CTA_ENABLED) return null;

  if (variant === "inline") {
    return (
      <section
        role="region"
        aria-label="Breaking live news"
        className={cn("mb-0", className)}
      >
        <Link
          href="/kindjoe-watch"
          title="Open Kind Joe Watch"
          className="group inline-flex max-w-full items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-white py-2 pl-2.5 pr-2 shadow-sm transition hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:gap-2.5 sm:py-2 sm:pl-3 sm:pr-2.5"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/40" />
            <span className="relative h-2 w-2 rounded-full bg-red-600" />
          </span>
          <span className="min-w-0 text-left text-[11px] font-semibold leading-tight text-neutral-900 sm:text-xs">
            <span className="sm:hidden">Live · Kind Joe Watch</span>
            <span className="hidden sm:inline">Breaking live · Kind Joe Watch</span>
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-red-700 transition group-hover:translate-x-0.5 sm:h-4 sm:w-4"
            aria-hidden
          />
        </Link>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="Breaking live news"
      className={cn("mb-6 px-4 lg:px-0", className)}
    >
      <Link
        href="/kindjoe-watch"
        className="group flex min-h-[3.25rem] flex-col gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-white px-3 py-3.5 shadow-sm transition hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:px-4 sm:py-3"
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0 sm:mt-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/40" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-[13px] font-bold leading-snug text-neutral-900 sm:text-sm">
              Breaking live news
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-neutral-600 sm:text-xs">
              Follow Kind Joe Watch as stories develop.
            </p>
          </div>
        </div>
        <span className="flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-md bg-red-600/10 px-3 text-sm font-semibold text-red-800 group-hover:bg-red-600/15 group-hover:text-red-900 sm:min-h-0 sm:justify-end sm:bg-transparent sm:px-0 sm:text-red-700 sm:group-hover:text-red-800">
          Open Kind Joe Watch
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
