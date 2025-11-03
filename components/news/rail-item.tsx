import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/types/article";

type Props = { article: Article };

export default function RailItem({ article }: Props) {
  const { title, category, imageSrc, href = "#" } = article;

  return (
    <Link href={href} className="group block">
      <Card className="rounded-none border-0 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="relative w-32 sm:w-36 aspect-video flex-shrink-0 overflow-hidden rounded-md">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            {category && (
              <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 uppercase">
                {category}
              </Badge>
            )}
            <h3 className="mt-1 font-semibold text-sm sm:text-base leading-snug line-clamp-2 group-hover:underline">
              {title}
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

RailItem.Skeleton = function RailItemSkeleton() {
  return (
    <Card className="rounded-none border-0 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="relative w-32 sm:w-36 aspect-video flex-shrink-0 overflow-hidden rounded-md">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
