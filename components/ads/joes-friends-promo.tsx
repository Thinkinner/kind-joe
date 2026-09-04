import { ExternalLink } from "lucide-react";

const HREF = "https://media.kindjoe.com/";

type JoesFriendsPromoProps = {
  /** Sidebar card, listing banner, or compact strip for posts feeds. */
  variant?: "sidebar" | "banner" | "compact";
  className?: string;
};

export function JoesFriendsPromo({
  variant = "sidebar",
  className = "",
}: JoesFriendsPromoProps) {
  if (variant === "compact") {
    return (
      <aside
        className={`flex items-center justify-between gap-3 border border-neutral-200 bg-neutral-50 px-3 py-2.5 sm:px-4 ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <p className="min-w-0 text-[13px] leading-snug text-neutral-700">
          <span className="font-semibold text-neutral-900">Joe&apos;s Friends</span>
          {" — "}
          we run your social.{" "}
          <span className="hidden text-neutral-500 sm:inline">
            Management, editing &amp; growth.
          </span>
        </p>
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          Learn more
          <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
        </a>
      </aside>
    );
  }

  if (variant === "banner") {
    return (
      <aside
        className={`relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0b1220] text-white ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 100% 0%, rgba(207,26,30,0.35), transparent 55%), radial-gradient(ellipse 50% 60% at 0% 100%, rgba(207,26,30,0.12), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400">
              Joe&apos;s Friends · by Kind Joe
            </p>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight sm:text-xl">
              Stop running your own content department.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/65">
              We manage your social, edit and create posts, and grow the audience —
              with a niche already delivering millions of views.
            </p>
          </div>
          <a
            href={HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500"
          >
            See Joe&apos;s Friends
            <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
          </a>
        </div>
      </aside>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl text-white shadow-lg shadow-black/10 ${className}`}
      aria-label="Joe's Friends promotion"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 0% 0%, rgba(207,26,30,0.3), transparent 55%), linear-gradient(165deg, #0b1220 0%, #111827 50%, #0a1628 100%)",
        }}
      />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-600/20" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/5" aria-hidden />

      <div className="relative p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400">
          Joe&apos;s Friends
        </p>
        <h3 className="mt-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          We run your social.
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Social media company by Kind Joe — management, editing, original content,
          and podcasts. Proven niche. Millions of views.
        </p>
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/30 transition hover:bg-red-500"
        >
          Learn more
          <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
        </a>
      </div>
    </section>
  );
}
