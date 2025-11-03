"use client";

import { JSX } from "react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"; // optional utility from shadcn template

// Define allowed content block shapes
export type Block =
  | { type: "heading"; level?: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt?: string; caption?: string; width?: number; height?: number }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; style?: "bullet" | "number"; items: string[] }
  | { type: "embed"; provider?: "youtube" | "twitter" | "tiktok" | "generic"; url: string }
  | { type: "divider" };

// Main component
export function ArticleRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks?.length) return null;

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:scroll-mt-20">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const Tag = (`h${b.level ?? 2}` as keyof JSX.IntrinsicElements);
            return (
              <Tag key={i} className="font-semibold tracking-tight mt-10 first:mt-0">
                {b.text}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={i} className="leading-relaxed text-slate-700 dark:text-slate-300">
                {b.text}
              </p>
            );

          case "image":
            return (
              <figure key={i} className="my-8 flex flex-col items-center">
                <div className="relative w-full overflow-hidden rounded-xl border bg-slate-50">
                  <Image
                    src={b.src}
                    alt={b.alt ?? ""}
                    width={b.width ?? 1200}
                    height={b.height ?? 675}
                    className="object-cover w-full h-auto"
                    priority={i === 0}
                  />
                </div>
                {b.caption && (
                  <figcaption className="text-sm text-muted-foreground mt-2 text-center">
                    {b.caption}
                  </figcaption>
                )}
              </figure>
            );

          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-primary pl-4 italic text-slate-600 dark:text-slate-300 my-6"
              >
                “{b.text}”
                {b.cite && <footer className="mt-2 text-sm text-muted-foreground">— {b.cite}</footer>}
              </blockquote>
            );

          case "list":
            return b.style === "number" ? (
              <ol key={i} className="list-decimal list-inside space-y-1 my-4">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="list-disc list-inside space-y-1 my-4">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );

          case "embed":
            if (b.provider === "youtube" && b.url.includes("youtube")) {
              const videoId = new URL(b.url).searchParams.get("v");
              return (
                <div key={i} className="my-8 aspect-video rounded-xl overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              );
            }

            return (
              <div key={i} className="my-8">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline break-words"
                >
                  {b.url}
                </a>
              </div>
            );

          case "divider":
            return <Separator key={i} className="my-10" />;

          default:
            return null;
        }
      })}
    </article>
  );
}
