"use client";

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
    <div className="w-full max-w-xl bg-white/95 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden font-sans">
      {/* Cover */}
      <div className="relative w-full aspect-[16/9] group cursor-pointer bg-neutral-100">
        <img
          className="w-full h-full object-cover"
          src="https://picsum.photos/600/400?random=50"
          alt="The Kindjoe Show social cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top-left label */}
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80 backdrop-blur">
          <Instagram className="w-3.5 h-3.5" />
          <span>Social Hub</span>
        </div>

        {/* Main CTA */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[88%]">
          <a
            href={mainLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-xl flex justify-center items-center gap-2.5 shadow-lg shadow-red-600/40 transform group-hover:translate-y-[-2px] group-hover:shadow-xl transition-all duration-300"
          >
            <Instagram className="text-white w-5 h-5" />
            <span className="text-white text-sm md:text-base font-semibold text-center">
              Watch The Kindjoe Show: Exclusive
            </span>
          </a>
        </div>
      </div>

      {/* Header / intro */}
      <div className="px-4 md:px-6 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">
          Connect with The Kindjoe Show
        </h2>
        <p className="mt-1 text-xs md:text-sm text-neutral-500">
          Follow across platforms for behind-the-scenes, short clips, and more.
        </p>
      </div>

      <div className="w-full h-px bg-neutral-100" />

      {/* Links list */}
      <div className="divide-y divide-neutral-100">
        {socialItems.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors group/item"
          >
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className="relative">
                <img
                  className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover border border-white shadow-sm group-hover/item:border-neutral-200 transition-colors"
                  src={item.img}
                  alt={item.handle}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/100/100?random=${index + 10}`;
                  }}
                />
                {/* Small platform badge (optional / generic) */}
                <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-neutral-900 text-[9px] text-white px-1.5 py-0.5">
                  {item.platform ?? "Social"}
                </span>
              </div>

              {/* Text */}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="text-xs md:text-sm font-semibold text-neutral-900 group-hover/item:text-blue-600 truncate">
                  {item.handle}
                </div>
                <div className="mt-1 text-[11px] md:text-xs text-neutral-500 line-clamp-2">
                  {item.desc}
                </div>
              </div>
            </div>

            {/* Right side: external + subtle label */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:inline text-[10px] uppercase tracking-wide text-neutral-400">
                Visit
              </span>
              <ExternalLink className="text-neutral-300 w-4 h-4 group-hover/item:text-blue-600 transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};