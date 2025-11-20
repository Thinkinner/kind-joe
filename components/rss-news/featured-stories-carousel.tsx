"use client";

import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { ApiStory, StoryCard } from "@/types/article";

export function FeaturedStoriesCarouselHero() {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- fetch from /api/kindjoetopstories ----
  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      try {
        const res = await fetch("/api/articles/top-stories");
        if (!res.ok) throw new Error("Failed to fetch top stories");

        const data: ApiStory[] = await res.json();

        if (cancelled) return;

        const mapped: StoryCard[] = data.map((story) => ({
          id: story.id,
          title: story.title,
          imageSrc:
            story.coverImageUrl ||
            "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
          href: `/${story.slug}`,
        }));

        setStories(mapped);
      } catch (err) {
        console.error(err);
        setStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStories();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayed = stories.slice(0, 6);

  // ---- responsive chunk size ----
  const [chunkSize, setChunkSize] = useState(3);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 640) {
        setChunkSize(1);
      } else if (width < 1024) {
        setChunkSize(2);
      } else {
        setChunkSize(3);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const grouped = chunk(displayed, chunkSize);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => {
      api.scrollNext();
    }, 12000);
    return () => clearInterval(interval);
  }, [api]);

  const handleDotClick = (index: number) => {
    api?.scrollTo(index);
  };

  if (!loading && grouped.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full px-6 md:px-10 py-8 overflow-hidden">
      {/* 
        🎥 VIDEO BACKGROUND
      */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        poster="/kindjoe-hero.png"
      >
        <source src="/featuredvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col gap-6">
        <h2 className="text-white text-3xl md:text-5xl font-bold font-[Poppins]">
          Today's Stories
        </h2>

        {loading && (
          <p className="text-sm text-red-100/80 animate-pulse">
            Loading featured stories…
          </p>
        )}

        {!loading && (
          <>
            <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
              <CarouselContent className="-ml-2 md:-ml-4">
                {grouped.map((group, idx) => (
                  <CarouselItem key={idx} className="pl-2 md:pl-4 basis-full">
                    {/* 
                      ADDED: group/list 
                      This allows the children to detect when the PARENT grid is hovered 
                    */}
                    <div
                      className={`grid gap-4 group/list ${
                        chunkSize === 1
                          ? "grid-cols-1"
                          : chunkSize === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                      }`}
                    >
                      {group.map((story) => (
                        <a
                          key={story.id}
                          href={story.href}
                          // ADDED:
                          // 1. group-hover/list:blur-[2px] -> When mouse enters grid, blur this card
                          // 2. group-hover/list:brightness-75 -> Darken it slightly
                          // 3. hover:!blur-none -> BUT if I am the specific card hovered, remove blur
                          // 4. hover:!brightness-100 -> And remove darkness
                          className="
                            relative w-full h-64 md:h-80 rounded-2xl overflow-hidden group shadow-lg 
                            hover:shadow-2xl hover:-translate-y-1 hover:z-10
                            transition-all duration-500 ease-out
                            group-hover/list:blur-[3px] group-hover/list:brightness-75
                            hover:!blur-none hover:!brightness-100
                          "
                        >
                          <img
                            src={story.imageSrc}
                            className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                            alt={story.title}
                          />

                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 transition-colors duration-300 group-hover:bg-black/90">
                            <div className="w-6 h-1 bg-red-600 mb-2" />
                            <h3 className="text-white text-sm md:text-base font-bold leading-snug">
                              {story.title}
                            </h3>
                            <p className="text-white text-xs mt-1 flex items-center gap-1">
                              <span className="text-blue-400 group-hover:text-blue-300 transition-colors">
                                Read Full Story
                              </span>
                              <span className="text-blue-400 group-hover:text-blue-300 transition-transform duration-300 group-hover:translate-x-1">
                                →
                              </span>
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <div className="flex justify-center gap-2 mt-2">
              {grouped.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDotClick(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={idx === current}
                  className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                    idx === current
                      ? "w-6 bg-white"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Split array into chunks
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}