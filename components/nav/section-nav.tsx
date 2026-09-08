"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAV_EXTRA_LINKS,
  NAV_LOCAL_LINKS,
  NAV_TOPIC_LINKS,
  type PublicNavLink,
} from "@/lib/nav/public-links";
import { cn } from "@/lib/utils";

function SectionLink({
  link,
  pathname,
}: {
  link: PublicNavLink;
  pathname: string;
}) {
  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
  return (
    <Link
      href={link.href}
      title={link.title}
      className={cn(
        "shrink-0 whitespace-nowrap px-2 py-2.5 text-[13px] font-semibold transition-colors sm:px-2.5",
        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200",
      )}
    >
      {link.name}
    </Link>
  );
}

export function SectionNav() {
  const pathname = usePathname();

  return (
    <div className="border-t border-white/[0.06] bg-[#030304]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <Link
          href="/"
          className={cn(
            "shrink-0 whitespace-nowrap py-2.5 pr-2 text-[13px] font-semibold",
            pathname === "/" ? "text-white" : "text-zinc-500 hover:text-zinc-200",
          )}
        >
          Home
        </Link>
        <span className="hidden h-3 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
        {NAV_LOCAL_LINKS.map((link) => (
          <SectionLink key={link.href} link={link} pathname={pathname} />
        ))}
        <span className="hidden h-3 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
        {NAV_TOPIC_LINKS.map((link) => (
          <SectionLink key={link.href} link={link} pathname={pathname} />
        ))}
        <span className="hidden h-3 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
        {NAV_EXTRA_LINKS.map((link) => (
          <SectionLink key={link.href} link={link} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}
