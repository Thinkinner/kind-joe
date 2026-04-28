"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";

type PostCard = { id: number; imageUrl: string; destinationUrl: string };

const INITIAL_VISIBLE = 12;
const LOAD_MORE_STEP = 9;

export function StandalonePostsGrid({ allPosts }: { allPosts: PostCard[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const visiblePosts = allPosts.slice(0, visibleCount);
  const remaining = Math.max(0, allPosts.length - visibleCount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3">
        {visiblePosts.map((post) => {
          const optimizedImage = optimizeCloudinaryUrl(post.imageUrl, {
            transforms: ["ar_4:5", "c_fill", "g_auto", "w_800"],
          });
          return (
            <Link
              key={post.id}
              href={post.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[4/5] overflow-hidden border border-gray-100 bg-gray-50"
            >
              <Image
                src={optimizedImage}
                fill
                alt=""
                className="object-cover transition duration-700 ease-in-out group-hover:scale-105"
                sizes="(max-width: 768px) 33vw, 400px"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tighter shadow-sm">
                  Read Story
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {remaining > 0 ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
          >
            Load more ({Math.min(LOAD_MORE_STEP, remaining)})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
