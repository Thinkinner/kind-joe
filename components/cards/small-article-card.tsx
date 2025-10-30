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
  imageSrc = "https://placehold.co/500x550/png",
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

        <div className="relative w-30 h-30 flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <Image src={imageSrc} alt={title} fill className="object-cover" />
          ) : (
            <Skeleton className="h-[120px] w-[120px]" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 👇 attach skeleton to the default export
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
        <Skeleton className="h-[120px] w-[120px]" />
      </CardContent>
    </Card>
  );
};
