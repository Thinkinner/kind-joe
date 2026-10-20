import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StoryListRow } from "@/components/home/story-list-row";
import { articlePublicPath } from "@/lib/brand/article-theme";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatHeadline } from "@/lib/format/headline";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { LOCAL_NEWS_REGIONS } from "@/lib/local-news/regions";
import type { ArticleSummary } from "@/types/article";

type LocalDesk = {
  region: (typeof LOCAL_NEWS_REGIONS)[number];
  articles: ArticleSummary[];
};

const DESK_GLOW: Record<
  (typeof LOCAL_NEWS_REGIONS)[number]["id"],
  string
> = {
  ventura: "from-orange-500/25 via-orange-500/5 to-transparent",
  oxnard: "from-rose-500/25 via-rose-500/5 to-transparent",
  la: "from-blue-500/25 via-blue-500/5 to-transparent",
  slo: "from-teal-400/25 via-teal-500/5 to-transparent",
};

function DeskColumn({ articles }: { articles: ArticleSummary[] }) {
  const [lead, ...rest] = articles;
  const leadHeadline = formatHeadline(lead.title);
  const leadImage = optimizeCloudinaryUrl(
    lead.coverImageUrl ?? "/placeholder.jpg",
    { width: 720 },
  );
  const leadTime = formatTimeAgo(lead.publishedAt ?? null);

  return (
    <div>
      <ul className="divide-y divide-white/10 md:hidden">
        {articles.map((article) => (
          <li key={article.id}>
            <StoryListRow article={article} tone="dark" forceShowImage />
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Link
          href={articlePublicPath(lead.slug)}
          className="group relative mb-1 block overflow-hidden rounded-xl"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
            <Image
              src={leadImage}
              alt={leadHeadline}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              {leadTime ? (
                <p className="mb-1 text-[11px] font-medium text-white/60">
                  {leadTime}
                </p>
              ) : null}
              <h4 className="line-clamp-3 text-[16px] font-semibold leading-snug text-white [font-family:var(--font-lora),ui-serif,Georgia,serif] transition-colors group-hover:text-red-200">
                {leadHeadline}
              </h4>
            </div>
          </div>
        </Link>

        {rest.length > 0 ? (
          <ul className="divide-y divide-white/10">
            {rest.map((article) => (
              <li key={article.id}>
                <StoryListRow article={article} tone="dark" forceShowImage />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function LocalDesks({ desks }: { desks: LocalDesk[] }) {
  if (desks.every((desk) => desk.articles.length === 0)) return null;

  return (
    <section
      aria-labelledby="local-news-heading"
      className="relative overflow-hidden bg-[#07111f] text-white"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: [
            "radial-gradient(ellipse 42% 55% at 8% 18%, rgba(249,115,22,0.22), transparent 58%)",
            "radial-gradient(ellipse 38% 45% at 50% -8%, rgba(37,99,235,0.28), transparent 52%)",
            "radial-gradient(ellipse 42% 50% at 94% 88%, rgba(13,148,136,0.22), transparent 55%)",
            "linear-gradient(180deg, #08101c 0%, #0a1628 48%, #07111f 100%)",
          ].join(", "),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-400">
              From the desks
            </p>
            <h2
              id="local-news-heading"
              className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Local
            </h2>
            <span className="mt-3 block h-[3px] w-12 rounded-full bg-[#CF1A1E]" />
          </div>
          <p className="max-w-xs text-sm text-white/45">
            Ventura County · Oxnard · Los Angeles · San Luis Obispo
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {desks.map(({ region, articles }) => (
            <article
              key={region.slug}
              id={region.slug}
              className="relative min-w-0 scroll-mt-28 overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-sm"
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${DESK_GLOW[region.id]}`}
                aria-hidden
              />
              <div className={`relative h-1 w-full ${region.accentBarClass}`} />
              <div className="relative p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                      {region.eyebrow}
                    </p>
                    <h3 className="truncate text-lg font-bold tracking-tight text-white">
                      {region.name}
                    </h3>
                  </div>
                  <Link
                    href={region.href}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/18 hover:text-white"
                  >
                    View all
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {articles.length === 0 ? (
                  <p className="py-6 text-sm text-white/45">
                    New {region.name} stories will appear here soon.
                  </p>
                ) : (
                  <DeskColumn articles={articles} />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
