import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StoryListRow } from "@/components/home/story-list-row";
import { articlePublicPath } from "@/lib/brand/article-theme";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatHeadline } from "@/lib/format/headline";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { regionLabelForArticle } from "@/lib/local-news/region-label";
import type { ArticleSummary } from "@/types/article";

function StoryMeta({
  article,
  onDark = false,
}: {
  article: ArticleSummary;
  onDark?: boolean;
}) {
  const kicker = regionLabelForArticle(article);
  const timeAgo = formatTimeAgo(article.publishedAt ?? null);
  if (!kicker && !timeAgo) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 text-[11px] font-medium sm:text-xs ${
        onDark ? "text-white/65" : "text-neutral-500"
      }`}
    >
      {kicker ? (
        <span className={onDark ? "font-semibold text-red-400" : "font-semibold text-[#CF1A1E]"}>
          {kicker}
        </span>
      ) : null}
      {kicker && timeAgo ? (
        <span className={onDark ? "text-white/30" : "text-neutral-300"}>·</span>
      ) : null}
      {timeAgo ? <span>{timeAgo}</span> : null}
    </div>
  );
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function TopStoriesPack({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  const [lead, ...rest] = articles;
  const side = rest.slice(0, 4);
  const headline = formatHeadline(lead.title);
  const path = articlePublicPath(lead.slug);
  const image = optimizeCloudinaryUrl(
    lead.coverImageUrl ?? "/placeholder.jpg",
    { width: 1600 },
  );

  return (
    <section
      aria-labelledby="top-stories-heading"
      className="relative overflow-hidden bg-[#030304] text-white"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: [
            "radial-gradient(ellipse 90% 70% at 0% -20%, rgba(207,26,30,0.38), transparent 55%)",
            "radial-gradient(ellipse 70% 55% at 100% 0%, rgba(16,42,128,0.55), transparent 50%)",
            "radial-gradient(ellipse 50% 40% at 85% 110%, rgba(207,26,30,0.18), transparent 50%)",
            "linear-gradient(180deg, #030304 0%, #080910 42%, #030304 100%)",
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

      <div className="relative mx-auto max-w-[1180px] px-4 py-9 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-400">
              Today
            </p>
            <h1
              id="top-stories-heading"
              className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Top stories
            </h1>
            <span className="mt-3 block h-[3px] w-12 rounded-full bg-[#CF1A1E]" />
          </div>
          <p className="text-sm text-white/45">{todayLabel()}</p>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-12 lg:gap-5">
          <Link
            href={path}
            className="group relative min-w-0 overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10 lg:col-span-7"
          >
            <div className="relative min-h-[380px] overflow-hidden bg-neutral-900 sm:min-h-[460px] lg:h-full lg:min-h-[560px]">
              <Image
                src={image}
                alt={headline}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 700px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/5"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
                <StoryMeta article={lead} onDark />
                <h2 className="mt-2 line-clamp-4 max-w-2xl text-[1.65rem] font-semibold leading-[1.12] tracking-tight text-white [font-family:var(--font-lora),ui-serif,Georgia,serif] sm:line-clamp-3 sm:text-[2.35rem]">
                  {headline}
                </h2>
                {lead.excerpt ? (
                  <p className="mt-3 hidden line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75 sm:block sm:text-[15px]">
                    {lead.excerpt}
                  </p>
                ) : null}
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-950 transition-colors group-hover:bg-[#CF1A1E] group-hover:text-white">
                  Read story
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {side.length > 0 ? (
            <>
              <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.04] px-4 ring-1 ring-white/10 backdrop-blur-sm lg:hidden">
                {side.map((article) => (
                  <li key={article.id}>
                    <StoryListRow article={article} tone="dark" />
                  </li>
                ))}
              </ul>
              <div className="hidden lg:col-span-5 lg:grid lg:grid-cols-2 lg:grid-rows-2 lg:gap-3">
                {side.map((article, index) => {
                  const itemHeadline = formatHeadline(article.title);
                  const thumb = optimizeCloudinaryUrl(
                    article.coverImageUrl ?? "/placeholder.jpg",
                    { width: 640 },
                  );
                  return (
                    <Link
                      key={article.id}
                      href={articlePublicPath(article.slug)}
                      className="group flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/[0.1] hover:ring-white/25"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-800">
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          sizes="240px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-white/90 backdrop-blur-sm">
                          {String(index + 2).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-3.5">
                        <StoryMeta article={article} onDark />
                        <h3 className="mt-1.5 line-clamp-3 text-[14px] font-semibold leading-snug text-white transition-colors group-hover:text-red-200">
                          {itemHeadline}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
