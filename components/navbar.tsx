"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/" },
    { name: "News", href: "/news" },
  ];

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
      <nav className="p-6 flex items-center justify-between bg-slate-900 ml">
        {/* Left: Logo */}
        <Link href="/" className="mr-auto">
          <Image
            src="/brand/horizontal-logo.svg"
            width={165}
            height={38}
            alt="KindJoe Horizontal Logo"
            className="cursor-pointer"
          />
        </Link>

        {/* Center: Nav Links */}
        <div className="hidden md:flex gap-8">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                text-white pb-1 transition 
                ${
                  isActive
                    ? "border-b-4 border-red-600"
                    : "border-b-2 border-transparent hover:border-slate-400"
                }
              `}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right: Toggle Button */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((s) => !s)}
          className={`rounded-full p-3 transition cursor-pointer ml-auto ${
            open
              ? "bg-black text-white hover:bg-slate-100"
              : "bg-white text-black hover:bg-slate-200"
          }`}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
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
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950/95 shadow-2xl border-l border-l-slate-800 p-6 flex flex-col"
              aria-modal="true"
              role="dialog"
            >
              {/* Header (Logo + Close Button) */}
              <div className="flex items-center justify-between">
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

              {/* Main Content Wrapper - pushes to bottom */}
              <div className="flex-1 flex flex-col justify-between mt-8">
                {/* Navigation Links */}
                <nav className="space-y-2 text-white">
                  {[
                    { name: "Home", href: "/" },
                    { name: "News", href: "/news" },
                  ].map((item, i, arr) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)} // 👈 close sidebar on tap/click
                      className={`
                        block text-lg font-semibold pb-5
                        ${i !== arr.length - 1 ? "border-b" : ""}
                        hover:text-slate-300 transition-colors
                      `}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Footer */}
              <footer className="text-center text-xs text-slate-500 mt-6">
                © {new Date().getFullYear()} KindJoe
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
