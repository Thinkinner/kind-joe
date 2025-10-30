import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SmallArticleCard({
  title = "Female founders say sexual harassment is still common while seeking VC funding",
  category = "EXCLUSIVE",
  imageSrc = "https://placehold.co/500x550/png",
  href = "#",
}) {
  return (
    <Card className="overflow-hidden cursor-pointer transition-shadow duration-300">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        {/* Left Content */}
        <div className="flex-1 min-w-0">
          <Badge className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 uppercase">
            {category}
          </Badge>

          <h3 className="mt-2 font-semibold text-base sm:text-lg leading-snug">
            <Link href={href} className="hover:underline line-clamp-2">
              {title}
            </Link>
          </h3>
        </div>

        {/* Right Image */}
        <div className="relative w-30 h-30 flex-shrink-0 overflow-hidden ">
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </div>
      </CardContent>
    </Card>
  );
}
