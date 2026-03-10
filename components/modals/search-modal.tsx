"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Search, FileText, Loader2, X, CornerDownLeft } from "lucide-react";
import { searchArticles } from "@/lib/actions/search"; // Adjust path to your action
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : null; // Toggle logic is handled in parent, but this prevents defaults
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [isOpen, onClose]);

  // Search Logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      startTransition(async () => {
        const data = await searchArticles(query);
        setResults(data);
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 border-b border-slate-800">
              <Search className="text-slate-500" size={20} />
              <input
                autoFocus
                className="w-full p-4 bg-transparent outline-none text-white text-lg placeholder:text-slate-600"
                placeholder="Search articles, news, and categories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isPending ? (
                <Loader2 className="animate-spin text-red-600" size={20} />
              ) : (
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-block text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded bg-slate-800">
                    ESC
                  </kbd>
                  <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
              {results.length > 0 ? (
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Results
                  </p>
                  {results.map((article) => (
                    <Link
                      key={article.id}
                      href={`/${article.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 group transition-all"
                    >
                      <div className="bg-slate-800 p-2 rounded group-hover:bg-slate-700 transition-colors">
                        <FileText size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-100 group-hover:text-red-500 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {article.excerpt}
                        </p>
                      </div>
                      <CornerDownLeft
                        size={14}
                        className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </Link>
                  ))}
                </div>
              ) : query.length > 1 && !isPending ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400">
                    No articles found for{" "}
                    <span className="text-white">"{query}"</span>
                  </p>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                  <Search size={40} className="text-slate-800" />
                  <p>Type to search KJ Featured Articles...</p>
                </div>
              )}
            </div>

            <div className="bg-slate-950/50 px-4 py-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="border border-slate-700 bg-slate-800 px-1 rounded text-slate-300">
                    Enter
                  </kbd>{" "}
                  to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-slate-700 bg-slate-800 px-1 rounded text-slate-300">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
              </div>
              <span className="text-slate-600">KindJoe Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
