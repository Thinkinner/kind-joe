"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
// import { Eye, ChevronRight } from "lucide-react";
// import {
//   formatSignalsViewerCount,
//   useSignalsLiveViewers,
// } from "@/hooks/use-signals-live-viewers";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import SearchModal from "@/components/modals/search-modal";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  // const signalsViewers = useSignalsLiveViewers();

  const links = [
    { name: "Home", href: "/" },
    { name: "Featured", href: "/news", title: "KJ Featured Articles" },
    { name: "Ventura County", href: "/ventura-county" },
    { name: "Council Tea", href: "/council-tea" },
    // { name: "Signals", href: "/kindjoe-signals" },
  ] as const;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? "hidden" : "auto";
  }, [open, searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-white/[0.04] bg-[#030304] shadow-[0_16px_48px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/25 to-transparent" />

        <nav className="relative mx-auto max-w-[1440px] px-3 pb-3 sm:px-5 lg:px-8 lg:pb-0">
          {/* Main bar */}
          <div className="flex h-[3.25rem] items-center justify-between gap-3 sm:h-14 lg:h-[3.75rem]">
            <Link
              href="/"
              className="flex min-w-0 shrink-0 items-center rounded-lg outline-none ring-red-500/0 transition ring-offset-2 ring-offset-[#030304] focus-visible:ring-2"
            >
              <Image
                src="/brand/horizontal-logo.svg"
                width={120}
                height={28}
                alt="Kind Joe"
                className="h-auto w-[100px] sm:w-[118px] lg:w-[138px]"
                priority
              />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden flex-1 justify-center lg:flex">
              <div className="flex items-center gap-1 rounded-full border border-white/[0.05] bg-black/55 p-1">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={"title" in link ? link.title : undefined}
                      className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                        isActive
                          ? "bg-white/[0.08] text-white shadow-inner shadow-black/40"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* LIVE watching pill — disabled for now
              <Link href="/kindjoe-signals" ...>{livePillInner}</Link>
              */}

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Search (⌘K)"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40 text-zinc-500 transition-colors hover:border-red-500/35 hover:bg-black/60 hover:text-red-400 lg:h-9 lg:w-9 lg:rounded-lg"
                aria-label="Search articles"
              >
                <Search className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]" strokeWidth={2} />
              </button>

              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((s) => !s)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40 text-zinc-300 transition-colors hover:border-red-500/30 hover:bg-black/55 hover:text-red-400 lg:hidden"
              >
                {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile LIVE watching strip — disabled for now
          <Link href="/kindjoe-signals" className="mb-3 ... lg:hidden">...</Link>
          */}
        </nav>
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[90] flex h-[100dvh] max-h-[100dvh] w-full max-w-sm flex-col border-l border-white/[0.05] bg-[#020203] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <Image
                  src="/brand/horizontal-logo.svg"
                  width={130}
                  height={30}
                  alt="Kind Joe"
                  className="h-auto w-[120px]"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-black/35 text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-black/50 hover:text-red-400"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer LIVE watching block — disabled for now
              <Link href="/kindjoe-signals" onClick={...} className="mb-4 ...">...</Link>
              */}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearchOpen(true);
                }}
                className="mb-6 flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3.5 text-left text-zinc-500 transition-colors hover:border-red-500/25 hover:bg-black/55 hover:text-zinc-200"
              >
                <Search className="h-5 w-5 shrink-0 text-zinc-500" />
                <span className="text-sm font-medium">Search articles…</span>
              </button>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {[
                  { name: "Home", href: "/" },
                  { name: "KJ Featured Articles", href: "/news" },
                  { name: "Ventura County", href: "/ventura-county" },
                  { name: "Council Tea", href: "/council-tea" },
                  { name: "Signals", href: "/kindjoe-signals" },
                ].map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center rounded-xl px-3 py-3.5 text-base font-semibold transition-colors ${
                        isActive
                          ? "bg-white/[0.06] text-red-400"
                          : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
