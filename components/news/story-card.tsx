import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/types/article";

type Props = { article: Article };

export default function StoryCard({ article }: Props) {
  const { title, category, imageSrc, href = "#", author, date } = article;

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-2xl"
    >
      <Card className="overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-0.5">
        <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-900">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {category && (
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] uppercase tracking-wider"
              >
                {category}
              </Badge>
            )}
            {date && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {date}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-semibold text-base leading-snug line-clamp-2 group-hover:underline">
            {title}
          </h3>
          {author && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              By {author}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

StoryCard.Skeleton = function StoryCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="relative w-full aspect-[16/10]">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-20 rounded" />
        <div className="mt-2 space-y-2">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="mt-2 h-4 w-24" />
      </CardContent>
    </Card>
  );
};
