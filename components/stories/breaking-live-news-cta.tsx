import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function BreakingLiveNewsCta() {
  return (
    <section
      role="region"
      aria-label="Breaking live news"
      className="mb-6 px-4 lg:px-0"
    >
      <Link
        href="/kindjoe-watch"
        className="group flex flex-col gap-3 rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-white px-4 py-3 shadow-sm transition hover:border-red-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/40" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold text-neutral-900">
              Breaking live news
            </p>
            <p className="text-xs text-neutral-600">
              Follow Kind Joe Watch as stories develop.
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-red-700 group-hover:text-red-800">
          Open Kind Joe Watch
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
