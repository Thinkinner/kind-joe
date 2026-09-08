"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/joes-friends#services", label: "Services" },
  { href: "/joes-friends#system", label: "Proof" },
  { href: "/joes-friends#podcast", label: "Podcast" },
  { href: "/joes-friends/contact", label: "Book a Call" },
];

export function JoesFriendsHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[190] transition-colors ${
        scrolled
          ? "border-b border-jf-line bg-jf-header backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/joes-friends" className="group flex items-baseline gap-2">
          <span className="font-jf-display text-lg uppercase tracking-tight sm:text-xl">
            Joe&apos;s Friends
          </span>
          <span className="hidden font-jf-hand text-lg text-jf-red sm:inline">
            by Kind Joe
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium uppercase tracking-wide text-jf-ink/70 transition-colors hover:text-jf-red"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="jf-stamp bg-jf-red px-3 py-1.5 text-[12px] font-bold uppercase text-white md:hidden"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-y-2 border-jf-ink bg-jf-surface px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-wide text-jf-ink transition-colors hover:text-jf-red"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
