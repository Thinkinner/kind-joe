"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // lock body scroll when sidebar is open
    document.body.style.overflow = open ? "hidden" : "auto";
    if (open && firstFocusableRef.current) firstFocusableRef.current.focus();
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav className="p-6 flex items-center justify-between border-b border-b-slate-200">
        <Link href="/">
          <Image
            src="/brand/horizontal-logo.svg"
            width={165}
            height={38}
            alt="KindJoe Horizontal Logo"
            className="cursor-pointer"
          />
        </Link>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((s) => !s)}
          className={`rounded-full p-3 transition cursor-pointer ${
            open
              ? "bg-white text-black hover:bg-slate-100"
              : "bg-black text-white hover:bg-slate-900"
          }`}
        >
          {open ? (
            <X size={24} className="stroke-current" />
          ) : (
            <Menu size={24} className="stroke-current" />
          )}
        </button>
      </nav>

      {/* Sidebar + backdrop */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar */}
            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950/95 shadow-2xl border-l border-l-slate-800 p-6"
              aria-modal="true"
              role="dialog"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/brand/horizontal-logo.svg"
                    width={140}
                    height={32}
                    alt="KindJoe"
                    className="select-none"
                  />
                </div>

                <button
                  ref={firstFocusableRef}
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                  className="-mr-2 rounded-full p-3 bg-white hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-8 space-y-6">
                <Link href="#" className="block text-lg font-semibold">
                  Home
                </Link>
                <Link href="#" className="block text-lg font-semibold">
                  About
                </Link>
                <Link href="#" className="block text-lg font-semibold">
                  Services
                </Link>
                <Link href="#" className="block text-lg font-semibold">
                  Blog
                </Link>
                <Link href="#" className="block text-lg font-semibold">
                  Contact
                </Link>
              </nav>

              <div className="mt-8 border-t border-t-slate-800 pt-6">
                <p className="text-sm text-slate-400">
                  Want something beautiful? Here's a quick showcase and a call
                  to action.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-2xl p-4 bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-transparent border border-slate-800">
                    <h4 className="text-base font-semibold">Featured</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Clean layouts, crisp typography, and subtle motion.
                    </p>
                  </div>

                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium hover:scale-[1.01] active:scale-100 transition-transform bg-white text-slate-950"
                  >
                    Get Started
                  </Link>

                  <div className="flex items-center gap-3 pt-2">
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      @twitter
                    </a>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      @dribbble
                    </a>
                  </div>
                </div>
              </div>

              <footer className="absolute bottom-6 left-6 right-6 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} KindJoe — Crafted with care
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
