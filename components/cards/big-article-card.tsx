import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type BigArticleCardProps = {
  title?: string;
  category?: string;
  date?: string;
  readTime?: string;
  imageSrc?: string;
  href?: string;
};

export default function BigArticleCard({
  title = "Amazon just kicked off the new era of giant AI layoffs",
  category = "EXCLUSIVE",
  date = "Oct 27 2025",
  readTime = "7 min read",
  imageSrc = "https://placehold.co/800x450/png",
  href = "#",
}: BigArticleCardProps) {
  return (
    <Card className="overflow-hidden p-2 lg:p-4">
      <div className="relative w-full aspect-video bg-slate-900">
        {imageSrc ? (
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>

      <CardContent className="py-6">
        <div className="flex items-center gap-3">
          {category ? (
            <Badge className="px-2 py-1 text-xs uppercase tracking-wider">
              {category}
            </Badge>
          ) : (
            <Skeleton className="h-5 w-24 rounded" />
          )}

          <div className="text-sm text-slate-400 flex items-center gap-2">
            {date ? (
              <span className="font-bold text-slate-950">{date}</span>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
            <span>·</span>
            {readTime ? (
              <span>{readTime}</span>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
          </div>
        </div>

        <h3 className="mt-4 text-lg sm:text-2xl font-semibold leading-tight">
          {title ? (
            <Link href={href} className="block hover:underline">
              {title}
            </Link>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          )}
        </h3>
      </CardContent>
    </Card>
  );
}

BigArticleCard.Skeleton = function BigArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden p-2 lg:p-4">
      <div className="relative w-full aspect-video">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="py-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <span>·</span>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
};
