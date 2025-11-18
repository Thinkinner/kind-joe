import React from 'react';
import { ArticleCard } from '@/types/article';

interface SidebarListProps {
  articles: ArticleCard[];
}

export const SidebarList: React.FC<SidebarListProps> = ({ articles }) => {
  return (
    <div className="w-full p-2.5 flex flex-col justify-start items-start gap-4">
      {articles.map((article, index) => {
        const isRightAligned = index % 2 !== 0;
        
        return (
          <div key={index} className="w-full flex flex-col gap-4 group cursor-pointer">
            <div className={`w-full flex gap-4 items-center ${isRightAligned ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              <div className="flex-shrink-0 overflow-hidden rounded-md shadow-sm">
                  <img 
                    className="w-24 h-16 md:w-36 md:h-24 object-cover transform group-hover:scale-110 transition-transform duration-500" 
                    src={article.imageUrl} 
                    alt={article.headline} 
                  />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                 <h3 className={`text-news-blue text-xs md:text-sm font-bold font-poppins line-clamp-3 group-hover:text-news-red transition-colors`}>
                    {article.headline}
                 </h3>
              </div>
            </div>
            <div className="w-full h-px bg-neutral-200"></div>
          </div>
        );
      })}
    </div>
  );
};