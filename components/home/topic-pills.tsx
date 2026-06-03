import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const TOPICS = [
  { href: "/news", label: "All news" },
  { href: "/topstories", label: "Top stories" },
  { href: "/ventura-county", label: "Ventura County" },
  { href: "/tech", label: "Tech" },
  { href: "/politics", label: "Politics" },
] as const;

export function TopicPills() {
  return (
    <>
      {TOPICS.map((topic) => (
        <Link
          key={topic.href}
          href={topic.href}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4 sm:py-2 sm:text-sm"
        >
          {topic.label}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
        </Link>
      ))}
    </>
  );
}
