import React from 'react';
import { ArticleCard } from '@/types/article';

interface NewsCardProps {
  article: ArticleCard;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  return (
    <div className="flex flex-col justify-start items-start gap-4 w-full">
      <div className="self-stretch aspect-[4/3] relative bg-black rounded-2xl overflow-hidden group">
        <img 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
          src={article.imageUrl} 
          alt={article.headline}
          loading="lazy"
        />
        <div className="absolute top-[17px] left-[19px]">
             <div className="px-4 py-2 bg-news-red rounded-md shadow-lg backdrop-blur-sm bg-opacity-90">
                <span className="text-white text-sm md:text-lg font-bold font-poppins tracking-wide">
                    {article.category}
                </span>
            </div>
        </div>
      </div>
      
      <div className="self-stretch flex flex-col justify-center items-start gap-3">
        <h2 className="self-stretch text-black text-xl md:text-2xl lg:text-3xl font-bold font-poppins leading-tight hover:text-news-red transition-colors cursor-pointer">
          {article.headline}
        </h2>
        <div className="self-stretch text-neutral-500 text-sm md:text-base font-normal font-poppins">
          {article.date}
        </div>
        <div className="self-stretch h-px bg-neutral-200 w-full mt-2"></div>
      </div>
    </div>
  );
};