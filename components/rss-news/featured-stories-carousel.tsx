"use client";

import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import type { ApiStory, StoryCard } from "@/types/article";

function storyGridColsClass(chunkSize: number) {
  return chunkSize === 1
    ? "grid-cols-1"
    : chunkSize === 2
      ? "grid-cols-2"
      : "grid-cols-3";
}

function StoryCardSkeleton() {
  return (
    <div
      className="relative h-52 w-full overflow-hidden rounded-xl shadow-lg sm:h-64 sm:rounded-2xl md:h-80"
      aria-hidden
    >
      <Skeleton className="absolute inset-0 h-full w-full rounded-2xl bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-4 backdrop-blur-xl">
        <div className="mb-2 h-1 w-6 rounded-sm bg-red-600/60" />
        <Skeleton className="mb-2 h-4 w-[92%] rounded-md bg-white/15" />
        <Skeleton className="h-3 w-28 rounded-md bg-white/10" />
      </div>
    </div>
  );
}

export function FeaturedStoriesCarouselHero() {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);

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
          imageSrc: optimizeCloudinaryUrl(
            story.coverImageUrl ||
              "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
            { width: 1200 },
          ),
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
    <div className="relative w-full min-w-0 max-w-full overflow-x-clip pb-20 sm:pb-16 md:pb-16">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        poster="/kindjoe-hero.png"
      >
        <source src="/featuredvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10 md:px-8 lg:py-12">
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400 sm:text-[11px] sm:tracking-[0.25em]">
            Featured
          </p>
          <h2 className="font-[Poppins] text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Today&apos;s top stories
          </h2>
        </div>

        {loading && (
          <div className={cn("grid gap-4", storyGridColsClass(chunkSize))}>
            {Array.from({ length: chunkSize }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && grouped.length > 0 && (
          <>
            <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
              <CarouselContent className="-ml-2 md:-ml-4">
                {grouped.map((group, idx) => (
                  <CarouselItem key={idx} className="basis-full pl-2 md:pl-4">
                    <div
                      className={cn(
                        "group/list grid gap-4",
                        storyGridColsClass(chunkSize),
                      )}
                    >
                      {group.map((story) => (
                        <a
                          key={story.id}
                          href={story.href}
                          className="
                            group relative h-52 w-full overflow-hidden rounded-xl shadow-lg
                            transition-all duration-500 ease-out
                            sm:h-64 sm:rounded-2xl md:h-80
                            [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:z-10 [@media(hover:hover)]:hover:shadow-2xl
                            [@media(hover:hover)]:group-hover/list:blur-[3px] [@media(hover:hover)]:group-hover/list:brightness-75
                            [@media(hover:hover)]:hover:!blur-none [@media(hover:hover)]:hover:!brightness-100
                          "
                        >
                          <img
                            src={story.imageSrc}
                            className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                            alt={story.title}
                          />

                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 backdrop-blur-xl transition-colors duration-300 sm:p-4 [@media(hover:hover)]:group-hover:bg-black/90">
                            <div className="mb-1.5 h-1 w-5 bg-red-600 sm:mb-2 sm:w-6" />
                            <h3 className="line-clamp-3 text-sm font-bold leading-snug text-white sm:line-clamp-2 md:text-base">
                              {story.title}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-white sm:text-xs">
                              <span className="text-blue-400 transition-colors group-hover:text-blue-300">
                                Read Full Story
                              </span>
                              <span className="text-blue-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-300">
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

            <div className="mt-2 flex justify-center gap-2">
              {grouped.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDotClick(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={idx === current}
                  className={`h-2 cursor-pointer rounded-full transition-all duration-500 ${
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
