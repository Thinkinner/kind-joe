import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const HOME_HREF = "/joes-friends";
const CONTACT_HREF = "/joes-friends/contact";

const WHAT_YOU_GET = [
  "Daily posting & captions",
  "Video editing",
  "Audio podcast",
];

const PROOF = [
  { value: "20M+", label: "views" },
  { value: "10K", label: "new followers" },
  { value: "6M+", label: "YouTube views" },
];

type JoesFriendsPromoProps = {
  /** Sidebar card, listing banner, or compact strip for posts feeds. */
  variant?: "sidebar" | "banner" | "compact";
  className?: string;
};

function PromoLabel({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
          tone === "dark" ? "text-red-400" : "text-red-600"
        }`}
      >
        Joe&apos;s Friends
      </span>
      <span
        className={`text-[11px] ${
          tone === "dark" ? "text-white/40" : "text-neutral-400"
        }`}
      >
        by Kind Joe
      </span>
      <span
        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          tone === "dark"
            ? "bg-white/10 text-white/50"
            : "bg-neutral-200 text-neutral-500"
        }`}
      >
        Promoted
      </span>
    </div>
  );
}

function ProofRow({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      {PROOF.map((stat) => (
        <span key={stat.label} className="flex items-baseline gap-1.5">
          <span
            className={`text-base font-bold tabular-nums ${
              tone === "dark" ? "text-white" : "text-neutral-900"
            }`}
          >
            {stat.value}
          </span>
          <span
            className={`text-xs ${
              tone === "dark" ? "text-white/50" : "text-neutral-500"
            }`}
          >
            {stat.label}
          </span>
        </span>
      ))}
    </p>
  );
}

export function JoesFriendsPromo({
  variant = "sidebar",
  className = "",
}: JoesFriendsPromoProps) {
  if (variant === "compact") {
    return (
      <aside
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-neutral-200 bg-neutral-50 px-3 py-2.5 sm:px-4 ${className}`}
        aria-label="Joe's Friends promotion"
      >
        <p className="min-w-0 text-[13px] leading-snug text-neutral-700">
          <span className="font-semibold text-neutral-900">
            We run your social media for you.
          </span>{" "}
          <span className="text-neutral-500">
            Posting, editing and growth by Kind Joe — 20M+ views so far.
          </span>
        </p>
        <Link
          href={CONTACT_HREF}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          Book a free call
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
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

        <div className="relative p-5 sm:p-6">
          <PromoLabel />

          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                We run your social media for you.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Send us your videos — or none at all. Kind Joe&apos;s team posts
                every day, edits the clips, and grows your following while you
                run your business.
              </p>

              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {WHAT_YOU_GET.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-sm text-white/85"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 text-red-400"
                      strokeWidth={3}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-white/10 pt-4">
                <ProofRow />
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
              <Link
                href={CONTACT_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500"
              >
                Book a free call
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={HOME_HREF}
                className="text-xs font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
              >
                See how it works
              </Link>
            </div>
          </div>
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
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-600/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/5"
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <PromoLabel />

        <h3 className="mt-4 text-xl font-bold leading-tight tracking-tight">
          We run your social media for you.
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Kind Joe&apos;s team posts every day, edits your videos, and grows
          your following.
        </p>

        <ul className="mt-4 space-y-2">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-white/85">
              <Check
                className="h-4 w-4 shrink-0 text-red-400"
                strokeWidth={3}
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-white/10 pt-4">
          <ProofRow />
        </div>

        <Link
          href={CONTACT_HREF}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/30 transition hover:bg-red-500"
        >
          Book a free call
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href={HOME_HREF}
          className="mt-3 block text-center text-xs font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
        >
          See how it works
        </Link>
      </div>
    </section>
  );
}
