import React from "react";
import { Instagram, ExternalLink } from "lucide-react";

interface SocialItem {
  handle: string;
  desc: string;
  img: string;
  url: string;
}

export const SocialWidget: React.FC = () => {
  // Added 'url' property to the data structure
  const socialItems: SocialItem[] = [
    {
      handle: "@TheKindJoe",
      desc: "Watch Kindjoe's originals and reels on Instagram.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd8896e287a04a164bec.png",
      url: "https://www.instagram.com/TheKindJoe",
    },
    {
      handle: "@JoeKnowsLosAngeles",
      desc: "Watch the latest updates and breaking news from Los Angeles County.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd88b55a59d2083e992f.png",
      url: "https://www.instagram.com/JoeKnowsLosAngeles",
    },
    {
      handle: "@JoeKnowsVentura",
      desc: "Your source for Ventura County news, events, and community stories.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd8896e2873808164bed.png",
      url: "https://www.instagram.com/JoeKnowsVentura",
    },
  ];

  const mainLink = "https://www.instagram.com/TheKindJoe";

  return (
    <div className="w-full bg-white rounded-md border border-neutral-200 flex flex-col justify-start items-center gap-6 overflow-hidden pb-6 shadow-sm font-sans">
      <div className="relative w-full h-64 group cursor-pointer">
        {/* Main Cover Image */}
        <img
          className="w-full h-full object-cover"
          src="https://picsum.photos/600/400?random=50"
          alt="Social Cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Main Call to Action Button - Wrapped in <a> tag */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%]">
          <a 
            href={mainLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-md flex justify-center items-center gap-2.5 shadow-lg transform group-hover:scale-105 transition-all duration-300"
          >
            <Instagram className="text-white w-5 h-5" />
            <span className="text-white text-sm md:text-base font-bold text-center">
              The Kindjoe Show: Exclusive
            </span>
          </a>
        </div>
      </div>

      <div className="w-full h-px bg-neutral-200"></div>

      {socialItems.map((item, index) => (
        <React.Fragment key={index}>
          {/* Individual Row - Wrapped in <a> tag to make the whole row clickable */}
          <a 
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 md:px-8 lg:px-6 xl:px-10 flex justify-between items-center gap-4 hover:bg-neutral-50 transition-colors py-2 group/item"
          >
            <div className="flex justify-start items-center gap-4 flex-1">
              <img
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md group-hover/item:border-neutral-200 transition-colors"
                src={item.img}
                alt="Profile"
                // Fallback for broken images in demo
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${index + 10}`;
                }}
              />
              <div className="flex flex-col justify-center items-start flex-1">
                <div className="text-black text-xs md:text-sm font-bold group-hover/item:text-blue-600 transition-colors">
                  {item.handle}
                </div>
                <div className="text-neutral-400 text-[10px] md:text-xs font-normal line-clamp-2 mt-1">
                  {item.desc}
                </div>
              </div>
            </div>
            <ExternalLink className="text-neutral-400 w-4 h-4 group-hover/item:text-blue-600 transition-colors" />
          </a>
          
          {index < socialItems.length - 1 && (
            <div className="w-full h-px bg-neutral-100 px-8"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};