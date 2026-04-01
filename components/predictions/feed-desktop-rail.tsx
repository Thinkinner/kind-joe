"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CirclePlus, Compass, Heart, House, Search, User } from "lucide-react";

function RailIconButton({
  children,
  active = false,
  href,
}: {
  children: ReactNode;
  active?: boolean;
  href?: string;
}) {
  const className = `flex h-10 w-10 items-center justify-center rounded-xl transition ${
    active
      ? "bg-white/12 text-white"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {children}
    </button>
  );
}

export function FeedDesktopRail({
  active = "home",
}: {
  active?: "home" | "search" | "new" | "likes" | "profile";
}) {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-16 border-r border-white/10 bg-black/55 backdrop-blur md:block">
      <div className="flex h-full flex-col items-center">
        <div className="pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
            <Compass size={16} />
          </div>
        </div>

        <div className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-2">
            <RailIconButton href="/feed" active={active === "home"}>
              <House size={18} />
            </RailIconButton>
            <RailIconButton active={active === "search"}>
              <Search size={18} />
            </RailIconButton>
            <RailIconButton active={active === "new"}>
              <CirclePlus size={18} />
            </RailIconButton>
            <RailIconButton active={active === "likes"}>
              <Heart size={18} />
            </RailIconButton>
            <RailIconButton active={active === "profile"}>
              <User size={18} />
            </RailIconButton>
          </div>
        </div>

        <div className="pb-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/80 transition hover:bg-white/10"
          >
            <User size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

