import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArticleCard } from "@/types/article";

interface NewsCardProps {
  article: ArticleCard;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  return (
    <Link 
      href={article.url} 
      className="group flex w-full flex-col gap-3"
    >
      {/* Image Container - Boxier, 16:9 aspect ratio */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-neutral-200">
        <Image
          src={article.imageUrl}
          alt={article.headline}
          fill
          className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Optional: 'Video' or 'Image' icon often appears here in Fox cards */}
        {/* <div className="absolute bottom-2 left-2 bg-black/60 p-1 rounded text-white">
             <Icon /> 
           </div> 
        */}
      </div>

      {/* Content Container */}
      <div className="flex flex-col gap-1.5 px-1">
        {/* Category - Red text, uppercase, above headline (Fox Style) */}
        <div className="flex items-center justify-between">
            <span className="font-poppins text-xs font-bold uppercase tracking-wider text-red-700">
              {article.category}
            </span>
            {/* Timestamp placeholder if you have it, otherwise remove */}
            {/* <span className="text-xs text-neutral-400">2h ago</span> */}
        </div>

        {/* Headline - Bold, dark, turns blue/underlined on hover */}
        <h2 className="line-clamp-3 font-poppins text-lg font-bold leading-snug text-neutral-900 group-hover:text-blue-900 group-hover:underline md:text-xl">
          {article.headline}
        </h2>
      </div>
    </Link>
  );
};