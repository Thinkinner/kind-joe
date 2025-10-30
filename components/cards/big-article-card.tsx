import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ArticleCard({
  title = "Amazon just kicked off the new era of giant AI layoffs",
  category = "EXCLUSIVE",
  date = "Oct 27 2025",
  readTime = "7 min read",
  imageSrc = "/cb52c0e1-fc79-4556-9644-28626a1b9333.png",
  href = "#",
}) {
  return (
    <Card className="overflow-hidden p-2 lg:p-4">
      {/* Image (16:9) */}
      <div className="relative w-full aspect-video bg-slate-900">
        <Image
          src="https://placehold.co/800x450/png"
          alt={title}
          fill
          className="object-cover"
        />
      </div>

      <CardContent className="py-6">
        <div className="flex items-center gap-3">
          <Badge className="px-2 py-1 text-xs uppercase tracking-wider">
            {category}
          </Badge>

          <div className="text-sm text-slate-400">
            <span className="font-bold text-slate-950">{date}</span>
            <span className="mx-2">·</span>
            <span>{readTime}</span>
          </div>
        </div>

        <h3 className="mt-4 text-lg sm:text-2xl font-semibold leading-tight">
          <Link href={href} className="block hover:underline">
            {title}
          </Link>
        </h3>

        <p className="mt-3 text-sm text-slate-400">
          A crisp, minimal article card built with shadcn components and
          Tailwind — optimized for clear hierarchy, contrast, and subtle
          surfaces.
        </p>

      </CardContent>
    </Card>
  );
}
