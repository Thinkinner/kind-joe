"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Users, Heart, Coffee, Star, Mail, MapPin, Phone, Send, Search } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/" },
    { name: "KJ Featured Articles", href: "/news" },
    { name: "Ventura County", href: "/ventura-county" },
    { name: "Newsletters", href: "/newsletter" },
    // { name: "About Us", href: "/about" },
    // { name: "Contact", href: "/contact" },
    // { name: "Editorial Policy", href: "/editorial-policy" },
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
      <nav className="bg-slate-950 p-4 shadow-lg">
        {/* Top Bar - Hidden on smaller screens */}
        <div className="hidden md:flex justify-end items-center text-xs text-gray-400 mb-2 border-b border-slate-800 pb-2">
          <span className="mr-4 hover:text-red-600 transition-colors duration-200">
            +1(888)-555-5555
          </span>
          <Link
            href="/contact"
            className="mr-4 hover:text-red-600 transition-colors duration-200"
          >
            Contact Us
          </Link>
          <Link
            href="/about"
            className="mr-4 hover:text-red-600 transition-colors duration-200"
          >
            About Us
          </Link>
          {/* <Link
        href="/sign-in"
        className="mr-4 hover:text-red-600 transition-colors duration-200"
      >
        Sign In
      </Link> */}
          <select
            className="bg-slate-900 text-gray-400 border border-slate-700 rounded px-2 py-1 mr-4 focus:outline-none focus:ring-1 focus:ring-red-600"
          >
            <option>English</option>
            <option>Spanish</option>
          </select>
          <button aria-label="Search" className="hover:text-red-600">
            <Search size={18} />
          </button>
        </div>

        {/* Main Navbar */}
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/horizontal-logo.svg"
              width={120} // Default smaller width for mobile
              height={28}
              alt="KindJoe Horizontal Logo"
              className="cursor-pointer md:w-[165px] md:h-[38px]" // Scales up for md and larger
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
              text-white pb-1 transition-colors duration-200
              ${isActive ? "text-red-600" : "hover:text-red-600"}
            `}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right: Subscribe Button & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button className="hidden lg:block bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200">
              Subscribe
            </button>

            <button
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((s) => !s)}
              className="text-white hover:text-red-600 transition-colors duration-200 lg:hidden"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar + backdrop for mobile */}
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
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar */}
            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-slate-950 shadow-2xl p-6 flex flex-col lg:hidden"
              aria-modal="true"
              role="dialog"
            >
              {/* Header (Logo + Close Button) */}
              <div className="flex items-center justify-between mb-8">
                <Image
                  src="/brand/horizontal-logo.svg"
                  width={140}
                  height={32}
                  alt="KindJoe"
                  className="select-none"
                />
                <button
                  ref={firstFocusableRef}
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                  className="p-2 text-white hover:text-red-600 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Top Bar Links (for mobile sidebar) */}
              <div className="flex flex-col gap-4 text-sm text-gray-400 mb-8 border-b border-slate-800 pb-6">
                <span className="hover:text-red-600 transition-colors duration-200">
                  +1(888)-555-5555
                </span>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="hover:text-red-600 transition-colors duration-200"
                >
                  Contact Us
                </Link>
                <Link
                  href="/about"
                  onClick={() => setOpen(false)}
                  className="mr-4 hover:text-red-600 transition-colors duration-200"
                >
                  About Us
                </Link>
                {/* <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="hover:text-red-600 transition-colors duration-200"
            >
              Sign In
            </Link> */}
                <select
                  className="bg-slate-900 text-gray-400 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-600"
                >
                  <option>English</option>
                  <option>Spanish</option>
                </select>
                <button aria-label="Search" className="flex items-center gap-2 hover:text-red-600">
                  <Search size={18} /> Search
                </button>
              </div>


              {/* Navigation Links */}
              <nav className="flex-1 space-y-4 text-white">
                {[
                  { name: "Home", href: "/" },
                  { name: "KJ Featured Articles", href: "/news" },
                  { name: "Ventura County", href: "/ventura-county" },
                  { name: "Newsletters", href: "/newsletter" },
                  // Add other links here if needed for mobile
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`
                block text-lg font-semibold py-2 border-b border-slate-800
                hover:text-red-600 transition-colors duration-200
                ${pathname === item.href ? "text-red-600" : ""}
              `}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Subscribe Button (for mobile sidebar) */}
              <button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-md mt-8 transition-colors duration-200">
                Subscribe
              </button>

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
