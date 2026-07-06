import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PRIMARY_NAV_LINKS } from "@/lib/nav/public-links";

const TOPICS = PRIMARY_NAV_LINKS.filter((link) => link.href !== "/").slice(0, 5);

export function TopicPills() {
  return (
    <>
      {TOPICS.map((topic) => (
        <Link
          key={topic.href}
          href={topic.href}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4 sm:py-2 sm:text-sm"
        >
          {topic.name}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
        </Link>
      ))}
    </>
  );
}
