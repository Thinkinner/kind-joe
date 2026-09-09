import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const HOME_HREF = "/joes-friends";
const CONTACT_HREF = "/joes-friends/contact";

const BANNER_IMG = "/ads/joes-friends-promo-banner.png";
const CARD_IMG = "/ads/joes-friends-promo-card.png";

type JoesFriendsPromoProps = {
  /**
   * sidebar — article / topic sidebars
   * banner — listing pages
   * compact — short strip
   * mini — tiny image chip for posts feeds
   * tile — one cell inside a posts grid
   */
  variant?: "sidebar" | "banner" | "compact" | "mini" | "tile";
  className?: string;
};

function PromotedPill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm ${className}`}
    >
      Promoted
    </span>
  );
}

export function JoesFriendsPromo({
  variant = "sidebar",
  className = "",
}: JoesFriendsPromoProps) {
  if (variant === "mini") {
    return (
      <aside
        className={`overflow-hidden rounded-lg border border-neutral-200 bg-white ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <Link
          href={CONTACT_HREF}
          className="group flex items-center gap-2.5 px-2 py-1.5 transition hover:bg-neutral-50"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
            <Image
              src={CARD_IMG}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <p className="min-w-0 flex-1 truncate text-[12px] leading-snug text-neutral-700">
            <span className="font-semibold text-neutral-900">
              Joe&apos;s Friends
            </span>
            <span className="text-neutral-400"> · </span>
            <span>We run your social · 20M+</span>
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white transition group-hover:bg-red-500">
            Call
            <ArrowRight className="h-2.5 w-2.5" aria-hidden />
          </span>
        </Link>
      </aside>
    );
  }

  if (variant === "tile") {
    return (
      <Link
        href={CONTACT_HREF}
        className={`group relative aspect-[4/5] overflow-hidden bg-[#0b1220] ${className}`}
        aria-label="Joe's Friends — book a free call"
      >
        <Image
          src={CARD_IMG}
          alt=""
          fill
          sizes="(max-width: 768px) 33vw, 360px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
          aria-hidden
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80">
          Ad
        </span>
        <span className="absolute inset-x-1.5 bottom-1.5 rounded bg-red-600 px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition group-hover:bg-red-500">
          Book a call
        </span>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <aside
        className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <Link
          href={CONTACT_HREF}
          className="group flex items-stretch gap-0 transition hover:bg-white"
        >
          <div className="relative hidden w-28 shrink-0 sm:block">
            <Image
              src={CARD_IMG}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-600">
                Joe&apos;s Friends
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900">
                We run your social — 20M+ views
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-red-500">
              Book a call
              <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </div>
        </Link>
      </aside>
    );
  }

  if (variant === "banner") {
    return (
      <aside
        className={`group relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0b1220] text-white shadow-lg shadow-black/10 ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <Link href={CONTACT_HREF} className="block">
          <div className="relative aspect-[21/9] w-full min-h-[180px] sm:min-h-[220px] lg:aspect-[2.6/1]">
            <Image
              src={BANNER_IMG}
              alt="Joe's Friends — we run your social. 20M+ views."
              fill
              sizes="(max-width: 768px) 100vw, 1100px"
              className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
              priority={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
              aria-hidden
            />
            <PromotedPill className="absolute right-3 top-3 sm:right-4 sm:top-4" />

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5 lg:p-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">
                  Joe&apos;s Friends · by Kind Joe
                </p>
                <p className="mt-1 max-w-lg text-lg font-bold leading-tight tracking-tight sm:text-xl">
                  We run your social media for you.
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition group-hover:bg-red-500">
                Book a free call
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
        </Link>
        <div className="border-t border-white/10 bg-[#0b1220]/95 px-4 py-2.5 text-center sm:px-5">
          <Link
            href={HOME_HREF}
            className="text-xs font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
          >
            See how it works →
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section
      className={`group relative overflow-hidden rounded-2xl text-white shadow-lg shadow-black/10 ${className}`}
      aria-label="Joe's Friends promotion"
    >
      <Link href={CONTACT_HREF} className="block">
        <div className="relative aspect-[4/5] w-full min-h-[280px]">
          <Image
            src={CARD_IMG}
            alt="Joe's Friends — we run your social. 20M+ views."
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
            aria-hidden
          />
          <PromotedPill className="absolute right-3 top-3" />

          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">
              Joe&apos;s Friends
            </p>
            <p className="mt-1.5 text-xl font-bold leading-tight tracking-tight">
              We run your social.
            </p>
            <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/30 transition group-hover:bg-red-500">
              Book a free call
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
