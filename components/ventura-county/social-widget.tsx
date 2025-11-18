import React from "react";
import { Instagram, ExternalLink } from "lucide-react";

export const SocialWidget: React.FC = () => {
  const socialItems = [
    {
      handle: "@TheKindJoe on Insta",
      desc: "Watch Kindjoe's originals and reels on Instagram.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd8896e287a04a164bec.png",
    },
    {
      handle: "@JoeKnowsLAnews Now",
      desc: "Watch the latest updates and breaking news from Los Angeles County.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd88b55a59d2083e992f.png",
    },
    {
      handle: "@JoeKnowsVentura Now",
      desc: "Your source for Ventura County news, events, and community stories.",
      img: "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd8896e2873808164bed.png",
    },
  ];

  return (
    <div className="w-full bg-white rounded-md border border-neutral-200 flex flex-col justify-start items-center gap-6 overflow-hidden pb-6 shadow-sm">
      <div className="relative w-full h-64 group">
        <img
          className="w-full h-full object-cover"
          src="https://picsum.photos/600/400?random=50"
          alt="Social Cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%]">
          <div className="w-full py-3 bg-news-red rounded-md flex justify-center items-center gap-2.5 shadow-lg transform group-hover:scale-105 transition-transform">
            <Instagram className="text-white w-5 h-5" />
            <span className="text-white text-sm md:text-base font-bold font-poppins text-center">
              The Kindjoe Show: Exclusive
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-neutral-200"></div>

      {socialItems.map((item, index) => (
        <React.Fragment key={index}>
          <div className="w-full px-4 md:px-8 lg:px-6 xl:px-10 flex justify-between items-center gap-4">
            <div className="flex justify-start items-center gap-4 flex-1">
              <img
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md"
                src={item.img}
                alt="Profile"
              />
              <div className="flex flex-col justify-center items-start flex-1">
                <div className="text-black text-xs md:text-sm font-bold font-poppins hover:text-blue-600 cursor-pointer transition-colors">
                  {item.handle}
                </div>
                <div className="text-neutral-400 text-[10px] md:text-xs font-normal font-poppins line-clamp-2 mt-1">
                  {item.desc}
                </div>
              </div>
            </div>
            <ExternalLink className="text-neutral-400 w-4 h-4 hover:text-black cursor-pointer" />
          </div>
          {index < socialItems.length - 1 && (
            <div className="w-full h-px bg-neutral-100 px-8"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
