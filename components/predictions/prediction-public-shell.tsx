"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { KindJoeHorizontalLogo } from "@/components/brand/kind-joe-horizontal-logo";

export function PredictionPublicShell({
  active,
  children,
}: {
  active: "articles" | "feed" | "markets" | "detail";
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 h-16 border-b border-[#27272a] bg-[#121214]">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <KindJoeHorizontalLogo href="/" size="sm" />

          <nav className="flex items-center gap-1 text-xs font-semibold sm:text-sm">
            <Link
              href="/"
              className={`rounded-md px-2.5 py-1.5 transition ${
                active === "articles"
                  ? "bg-[#1c1c1f] text-white"
                  : "text-[#a1a1aa] hover:bg-[#1c1c1f] hover:text-white"
              }`}
            >
              Articles
            </Link>
            <Link
              href="/predictions"
              className={`rounded-md px-2.5 py-1.5 transition ${
                active === "markets" || active === "detail" || active === "feed"
                  ? "bg-[#1c1c1f] text-white"
                  : "text-[#a1a1aa] hover:bg-[#1c1c1f] hover:text-white"
              }`}
            >
              Predictions
            </Link>
            <Link
              href="/account/profile"
              className="rounded-md px-2.5 py-1.5 text-[#a1a1aa] transition hover:bg-[#1c1c1f] hover:text-white"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
