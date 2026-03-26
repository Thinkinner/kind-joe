"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Search,
  Loader2,
  X,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { searchArticles } from "@/lib/actions/search";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type SearchHit = Awaited<ReturnType<typeof searchArticles>>[number];

export default function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isPending, startTransition] = useTransition();

  const qTrim = query.trim();
  const showResultList = qTrim.length >= 2;
  const visibleResults = showResultList ? results : [];

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (!isOpen) return;
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (qTrim.length < 2) {
      return;
    }

    let cancelled = false;
    const delayDebounceFn = setTimeout(() => {
      const searchFor = qTrim;
      startTransition(async () => {
        const data = await searchArticles(searchFor);
        if (!cancelled) setResults(data);
      });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [qTrim]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[min(12vh,6rem)] sm:pt-[10vh]">
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-zinc-950/75 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/85 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl sm:max-w-xl"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            <h2 id="search-modal-title" className="sr-only">
              Search articles
            </h2>

            <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] transition-shadow focus-within:ring-red-500/35">
                <Search
                  className="h-[18px] w-[18px] shrink-0 text-zinc-500"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-base"
                  placeholder="Search stories, topics, categories…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {isPending ? (
                <Loader2
                  className="h-5 w-5 shrink-0 animate-spin text-red-500/90"
                  aria-hidden
                />
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                  aria-label="Close"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-3">
              {visibleResults.length > 0 ? (
                <ul className="space-y-1">
                  <li className="px-2 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Results
                    </span>
                  </li>
                  {visibleResults.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/${article.slug}`}
                        onClick={handleClose}
                        className="group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20 transition-colors group-hover:bg-red-500/15">
                          <Sparkles
                            className="h-4 w-4 text-red-400/90"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 gap-y-1">
                            <span className="line-clamp-2 text-[15px] font-medium leading-snug text-zinc-100 group-hover:text-red-400">
                              {article.title}
                            </span>
                            {article.category ? (
                              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                {article.category}
                              </span>
                            ) : null}
                          </div>
                          {article.excerpt ? (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-zinc-500">
                              {article.excerpt}
                            </p>
                          ) : null}
                          {article.authorName ? (
                            <p className="mt-1.5 text-[11px] text-zinc-600">
                              {article.authorName}
                            </p>
                          ) : null}
                        </div>
                        <ArrowUpRight
                          className="mt-1 h-4 w-4 shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : showResultList && !isPending ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
                    <Search className="h-7 w-7 text-zinc-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-zinc-400">
                    No matches for{" "}
                    <span className="font-medium text-zinc-200">
                      &ldquo;{qTrim}&rdquo;
                    </span>
                  </p>
                  <p className="mt-2 max-w-xs text-xs text-zinc-600">
                    Try different keywords or browse{" "}
                    <Link
                      href="/news"
                      className="text-red-400/90 underline-offset-2 hover:underline"
                      onClick={handleClose}
                    >
                      featured articles
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/15 to-transparent ring-1 ring-red-500/20">
                    <Search
                      className="h-7 w-7 text-red-400/70"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">
                    Find a story
                  </p>
                  <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-zinc-600">
                    Type at least two characters. Press{" "}
                    <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      Esc
                    </kbd>{" "}
                    to close.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/20 px-3 py-2.5 sm:px-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ⌘K
                  </kbd>
                  <span className="hidden sm:inline">toggle</span>
                </span>
                <span className="hidden h-3 w-px bg-zinc-800 sm:block" />
                <span className="hidden items-center gap-1.5 sm:flex">
                  <kbd className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    Esc
                  </kbd>
                  close
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-700">
                Kind Joe
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
