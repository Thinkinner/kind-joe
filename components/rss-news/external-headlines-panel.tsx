"use client";

import { ExternalLink, Globe2, Rss } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ArticleWithSource } from "@/lib/rss-news/news";

const SOURCE_ACCENTS = [
  {
    bar: "bg-sky-500",
    badge: "bg-sky-100 text-sky-800",
    hover: "hover:border-sky-300 hover:shadow-sky-100/80",
  },
  {
    bar: "bg-violet-500",
    badge: "bg-violet-100 text-violet-800",
    hover: "hover:border-violet-300 hover:shadow-violet-100/80",
  },
  {
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    hover: "hover:border-emerald-300 hover:shadow-emerald-100/80",
  },
  {
    bar: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900",
    hover: "hover:border-amber-300 hover:shadow-amber-100/80",
  },
  {
    bar: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800",
    hover: "hover:border-rose-300 hover:shadow-rose-100/80",
  },
  {
    bar: "bg-cyan-500",
    badge: "bg-cyan-100 text-cyan-900",
    hover: "hover:border-cyan-300 hover:shadow-cyan-100/80",
  },
] as const;

function accentForSource(sourceName: string, index: number) {
  let hash = index;
  for (let i = 0; i < sourceName.length; i += 1) {
    hash = (hash + sourceName.charCodeAt(i)) % SOURCE_ACCENTS.length;
  }
  return SOURCE_ACCENTS[hash];
}

type ExternalHeadlinesPanelProps = {
  articles: ArticleWithSource[];
};

export function ExternalHeadlinesPanel({ articles }: ExternalHeadlinesPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="relative overflow-hidden border-t-4 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 py-12 sm:py-16 md:py-20"
      aria-labelledby="external-headlines-heading"
      initial={reduceMotion ? false : { opacity: 0 }}
      whileInView={reduceMotion ? undefined : { opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
    >
      {!reduceMotion ? (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
            animate={{ x: [0, -25, 0], y: [0, 15, 0], opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(167,139,250,0.16), transparent 35%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">
              <motion.span
                animate={reduceMotion ? undefined : { rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Rss className="h-3.5 w-3.5" aria-hidden />
              </motion.span>
              External sources
            </p>
            <h2
              id="external-headlines-heading"
              className="flex items-center gap-2.5 font-[Poppins] text-2xl font-bold text-white md:text-3xl"
            >
              <motion.span
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }
                }
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Globe2 className="h-6 w-6 text-sky-300" aria-hidden />
              </motion.span>
              Headlines from around the web
            </h2>
            <p className="text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Curated links to other publishers — not hosted on Kind Joe. For our
              original reporting, see the sections above.
            </p>
          </div>
          <motion.span
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm"
            animate={
              reduceMotion
                ? undefined
                : { boxShadow: ["0 0 0 rgba(56,189,248,0)", "0 0 20px rgba(56,189,248,0.25)", "0 0 0 rgba(56,189,248,0)"] }
            }
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Opens in new tab
          </motion.span>
        </motion.div>

        <motion.ul
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.1, delayChildren: 0.1 },
            },
          }}
        >
          {articles.map((item, index) => {
            const accent = accentForSource(item.source.name, index);

            return (
              <motion.li
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 28, scale: reduceMotion ? 1 : 0.96 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`group flex h-full overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-lg shadow-black/20 transition-shadow hover:shadow-xl ${accent.hover}`}
                >
                  <motion.div
                    className={`w-1.5 shrink-0 ${accent.bar}`}
                    aria-hidden
                    animate={
                      reduceMotion
                        ? undefined
                        : { scaleY: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }
                    }
                    transition={{ duration: 2.2 + index * 0.15, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {item.imageUrl ? (
                    <div className="relative hidden h-auto w-28 shrink-0 overflow-hidden sm:block md:w-32">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
                    </div>
                  ) : null}

                  <div className="flex min-w-0 flex-1 items-start gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.badge}`}
                      >
                        {item.source.name}
                      </span>
                      <p className="mt-2.5 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-slate-950 md:text-[15px]">
                        {item.modifiedTitle || item.title}
                      </p>
                    </div>
                    <ExternalLink
                      className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-600"
                      aria-hidden
                    />
                  </div>
                </a>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </motion.section>
  );
}
