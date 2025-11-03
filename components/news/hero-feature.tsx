import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/types/article";

type Props = { article: Article };

export default function HeroFeature({ article }: Props) {
  const { title, category, date, readTime, imageSrc, href = "#" } = article;

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-2xl"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
        {/* glass card */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-white/10 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {category && (
                <Badge className="px-2 py-1 text-[10px] uppercase tracking-wider">
                  {category}
                </Badge>
              )}
              {(date || readTime) && (
                <div className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  {date && (
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {date}
                    </span>
                  )}
                  {date && readTime && <span>•</span>}
                  {readTime && <span>{readTime}</span>}
                </div>
              )}
            </div>
            <h3 className="mt-2 sm:mt-3 text-xl sm:text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50">
              {title}
            </h3>
          </div>
        </div>
      </div>
    </Link>
  );
}

HeroFeature.Skeleton = function HeroFeatureSkeleton() {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
      <Skeleton className="w-full h-full" />
    </div>
  );
};
