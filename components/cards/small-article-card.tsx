// components/cards/small-article-card.tsx
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type SmallArticleCardProps = {
  title?: string;
  category?: string;
  imageSrc?: string;
  href?: string;
};

export default function SmallArticleCard({
  title = "Female founders say sexual harassment is still common while seeking VC funding",
  category = "EXCLUSIVE",
  imageSrc = "https://placehold.co/500x281/png", // 16:9 placeholder
  href = "#",
}: SmallArticleCardProps) {
  return (
    <Card className="overflow-hidden cursor-pointer transition-shadow duration-300">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="flex-1 min-w-0">
          {category ? (
            <Badge className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 uppercase">
              {category}
            </Badge>
          ) : (
            <Skeleton className="h-5 w-20 rounded" />
          )}

          <h3 className="mt-2 font-semibold text-base sm:text-lg leading-snug">
            {title ? (
              <Link href={href} className="hover:underline line-clamp-2">
                {title}
              </Link>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </h3>
        </div>

        {/* ✅ Maintain 16:9 aspect ratio */}
        <div className="relative w-40 aspect-video flex-shrink-0 overflow-hidden rounded-md">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 160px"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 👇 Skeleton version with 16:9 ratio
SmallArticleCard.Skeleton = function SmallArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-20 rounded" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* ✅ 16:9 aspect ratio skeleton */}
        <div className="relative w-40 aspect-video flex-shrink-0 overflow-hidden rounded-md">
          <Skeleton className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
};
