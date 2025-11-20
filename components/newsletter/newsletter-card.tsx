import React from 'react';
import { Newsletter } from './types';

interface NewsletterCardProps {
  newsletter: Newsletter;
  onSubscribe: (newsletterId: string) => void;
}

const NewsletterCard: React.FC<NewsletterCardProps> = ({ newsletter, onSubscribe }) => {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl border border-slate-100">
      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 relative">
        <img
          src={newsletter.imageUrl}
          alt={newsletter.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-xs font-medium text-slate-800 shadow-sm">
            {newsletter.frequency}
          </span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold text-slate-900">
          {newsletter.title}
        </h3>
        <p className="mt-3 flex-1 text-base leading-6 text-slate-600">
          {newsletter.description}
        </p>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onSubscribe(newsletter.id)}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors cursor-pointer"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterCard;
