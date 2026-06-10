"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import type { ArticleSummary } from "@/types/article";

function articlePath(slug: string, tags: unknown): string {
  const tagList = Array.isArray(tags) ? tags : [];
  const hasVenturaTag = tagList.some(
    (tag) =>
      tag &&
      typeof tag === "object" &&
      "slug" in tag &&
      (tag as { slug?: string }).slug === "ventura-county",
  );
  return hasVenturaTag ? `/ventura/${slug}` : `/${slug}`;
}

function AnimatedHeader({
  reduceMotion,
}: {
  reduceMotion: boolean | null;
}) {
  return (
    <div className="relative overflow-hidden border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0d0d14]"
        aria-hidden
      />

      {!reduceMotion ? (
        <>
          <motion.div
            aria-hidden
            className="absolute -left-8 top-0 h-36 w-36 rounded-full bg-red-700/35 blur-3xl"
            animate={{ x: [0, 48, 12, 0], y: [0, 18, 32, 0], scale: [1, 1.15, 0.95, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -right-10 bottom-0 h-32 w-44 rounded-full bg-rose-950/70 blur-3xl"
            animate={{ x: [0, -36, -8, 0], y: [0, -12, 20, 0], scale: [1, 1.2, 1, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute left-1/3 top-1/2 h-28 w-36 -translate-y-1/2 rounded-full bg-slate-600/25 blur-3xl"
            animate={{ x: [0, 24, -16, 0], opacity: [0.35, 0.65, 0.4, 0.35] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.07) 50%, transparent 65%)",
            }}
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
          />
        </>
      ) : null}

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          {!reduceMotion ? (
            <span className="relative flex h-2 w-2">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-red-400/80"
                animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden />
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-300/90">
            Don&apos;t miss these
          </p>
        </div>
        <h2
          id="editors-picks-heading"
          className="mt-1.5 font-[Poppins] text-lg font-bold tracking-tight text-white sm:text-xl"
        >
          Headlines worth your time
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
          Strong hooks from our archive — curated picks, not the hero carousel
          or the newest feed.
        </p>
      </div>
    </div>
  );
}

type EditorsPicksPanelProps = {
  articles: ArticleSummary[];
};

export function EditorsPicksPanel({ articles }: EditorsPicksPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="editors-picks-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500/80 to-transparent"
        aria-hidden
      />

      <AnimatedHeader reduceMotion={reduceMotion} />

      {articles.length === 0 ? (
        <div className="relative px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-slate-500">
            Fresh picks are on the way. Browse the latest stories below.
          </p>
          <Link
            href="/news"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-600"
          >
            Browse all stories
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <motion.ol
            className="relative px-1 sm:px-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: reduceMotion ? 0 : 0.08,
                  delayChildren: 0.12,
                },
              },
            }}
          >
            {articles.map((article, index) => {
              const timeAgo = formatTimeAgo(article.publishedAt ?? null);

              return (
                <motion.li
                  key={article.id}
                  variants={{
                    hidden: { opacity: 0, x: reduceMotion ? 0 : -12 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <Link
                    href={articlePath(article.slug, article.tags)}
                    className="group flex min-w-0 items-start gap-3 px-3 py-4 transition-colors hover:bg-slate-50 sm:gap-3.5 sm:px-3 sm:py-[1.125rem]"
                  >
                    <motion.div
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 sm:h-16 sm:w-16"
                      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    >
                      <img
                        src={optimizeCloudinaryUrl(
                          article.coverImageUrl ?? "/placeholder.jpg",
                          { width: 280 },
                        )}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-0 top-0 bg-gradient-to-br from-slate-900 to-slate-800 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white ring-1 ring-red-500/40">
                        {index + 1}
                      </span>
                    </motion.div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        {article.category ? (
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-red-600/90">
                            {article.category}
                          </span>
                        ) : null}
                        {timeAgo ? (
                          <span className="shrink-0 text-[10px] font-medium text-slate-400 sm:text-[11px]">
                            {timeAgo}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-3 break-words text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-slate-950 sm:text-sm">
                        {article.title}
                      </p>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </motion.ol>

          <div className="relative border-t border-slate-100 bg-slate-50/80 px-4 py-3.5 sm:px-5">
            <Link
              href="/news"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-red-600"
            >
              Browse all stories
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </>
      )}
    </motion.section>
  );
}
