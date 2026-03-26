"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Search, Eye } from "lucide-react";
import {
  formatSignalsViewerCount,
  useSignalsLiveViewers,
} from "@/hooks/use-signals-live-viewers";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import SearchModal from "@/components/modals/search-modal"; // Import the modal we created

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // NEW: Search state
  const pathname = usePathname();
  const signalsViewers = useSignalsLiveViewers();

  const links = [
    { name: "Home", href: "/" },
    { name: "KJ Featured Articles", href: "/news" },
    { name: "Ventura County", href: "/ventura-county" },
    { name: "Signals", href: "/kindjoe-signals" },
  ];

  // Global keyboard listener for Cmd+K
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
    // lock body scroll when sidebar OR search is open
    document.body.style.overflow = open || searchOpen ? "hidden" : "auto";
  }, [open, searchOpen]);

  return (
    <>
      <nav className="bg-slate-950 shadow-lg sticky top-0 z-[60]">
        <div className="px-3 py-2.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Logo */}
            <Link href="/" className="flex min-w-0 shrink items-center">
              <Image
                src="/brand/horizontal-logo.svg"
                width={120}
                height={28}
                alt="KindJoe Horizontal Logo"
                className="cursor-pointer w-[108px] h-auto sm:w-[120px] md:w-[165px] md:h-[38px]"
              />
            </Link>

            {/* Center: Nav Links (Desktop) */}
            <div className="hidden lg:flex gap-8">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                text-white pb-1 font-medium transition-colors duration-200
                ${isActive ? "text-red-600" : "hover:text-red-600"}
              `}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right: Search, Subscribe & Mobile Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
              <Link
                href="/kindjoe-signals"
                className="hidden lg:flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 transition-colors hover:border-[#00BFFF]/40 hover:text-white"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Eye size={16} className="text-[#00BFFF]/90" aria-hidden />
                <span className="text-xs font-medium tabular-nums">
                  {formatSignalsViewerCount(signalsViewers)} watching Signals
                </span>
              </Link>

              {/* Desktop Search Icon */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 px-3 py-2 rounded-md border border-slate-800"
              >
                <Search size={18} />
                <span className="text-xs font-medium">Search</span>
                <kbd className="text-[10px] opacity-50 bg-slate-800 px-1 rounded border border-slate-700">
                  ⌘K
                </kbd>
              </button>

              <button
                className="hidden lg:block bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-6 rounded-md transition-colors duration-200"
                onClick={() => (window.location.href = "/newsletter")}
              >
                Newsletters
              </button>

              {/* Mobile Search Icon */}
              <Link
                href="/kindjoe-signals"
                className="lg:hidden flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-lg border border-cyan-500/35 bg-gradient-to-b from-slate-900 to-slate-950 px-2.5 text-slate-200 shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] active:scale-[0.98] transition-transform sm:min-w-0 sm:px-3"
                aria-label={`${formatSignalsViewerCount(signalsViewers)} watching KindJoe Signals`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/55" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                </span>
                <Eye size={17} className="text-[#00BFFF] shrink-0" aria-hidden />
                <span className="hidden min-[360px]:flex flex-col items-start leading-none">
                  <span className="text-[11px] font-semibold tabular-nums text-white">
                    {formatSignalsViewerCount(signalsViewers)}
                  </span>
                  <span className="text-[9px] font-medium uppercase tracking-wide text-cyan-400/80">
                    live
                  </span>
                </span>
              </Link>

              <button
                onClick={() => setSearchOpen(true)}
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/5 hover:text-red-500 transition-colors"
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              <button
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((s) => !s)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/5 hover:text-red-500 transition-colors duration-200 lg:hidden"
              >
                {open ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* The Actual Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar + backdrop for mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-slate-950 shadow-2xl p-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Image
                  src="/brand/horizontal-logo.svg"
                  width={140}
                  height={32}
                  alt="KindJoe"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-white hover:text-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search inside Sidebar (Mobile) */}
              <button
                onClick={() => {
                  setOpen(false);
                  setSearchOpen(true);
                }}
                className="flex items-center gap-3 w-full bg-slate-900 text-slate-400 p-3 rounded-lg border border-slate-800 mb-6"
              >
                <Search size={20} />
                <span>Search Articles...</span>
              </button>

              <nav className="flex-1 space-y-4 text-white">
                {[
                  { name: "Home", href: "/" },
                  { name: "KJ Featured Articles", href: "/news" },
                  { name: "Ventura County", href: "/ventura-county" },
                  { name: "Signals", href: "/kindjoe-signals" },
                  { name: "Newsletters", href: "/newsletter" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between gap-3 text-lg font-semibold py-3 border-b border-slate-800 hover:text-red-600 transition-colors ${pathname === item.href ? "text-red-600" : ""}`}
                  >
                    <span>{item.name}</span>
                    {item.href === "/kindjoe-signals" && (
                      <span className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-mono font-semibold tabular-nums text-cyan-300">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
                          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                        {formatSignalsViewerCount(signalsViewers)}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              <button
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-md mt-8"
                onClick={() => {
                  window.location.href = "/newsletter";
                  setOpen(false);
                }}
              >
                Newsletter
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
