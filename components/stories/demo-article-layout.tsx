"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { ArticleData, ArticleBlock } from "@/types/demo-articles";

interface HeddaStyleArticleProps {
  data: ArticleData;
}

export function HeddaStyleArticle({ data }: HeddaStyleArticleProps) {
  const [showModal, setShowModal] = React.useState(false);

  // Keep existing height behavior; only height lives under coverImage
  const heroHeight = data.coverImage?.height ?? 600;

  const renderBlock = (block: ArticleBlock, i: number) => {
    switch (block.type) {
      case "kicker":
        return (
          <p
            key={i}
            className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 mb-6 md:mb-8 leading-relaxed"
          >
            {block.text}
          </p>
        );
      case "paragraph":
        return (
          <p
            key={i}
            className="text-base md:text-lg text-black mb-6 md:mb-8 leading-relaxed font-normal"
          >
            {block.text}
          </p>
        );
      case "heading":
        return (
          <h2
            key={i}
            className="text-2xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-4 md:mb-6 font-chivo"
          >
            {block.text}
          </h2>
        );
      case "subheading":
        return (
          <h3
            key={i}
            className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-3 md:mb-4"
          >
            {block.text}
          </h3>
        );
      case "list": {
        const Tag = (block.style === "ordered" ? "ol" : "ul") as "ol" | "ul";
        const base =
          "list-outside pl-5 md:pl-6 lg:pl-8 text-base md:text-lg text-black mb-6 md:mb-8 leading-relaxed";
        const cls =
          (block.style === "ordered" ? "list-decimal " : "list-disc ") + base;
        return (
          <Tag key={i} className={cls}>
            {block.items.map((it, idx) => (
              <li className="mb-2" key={idx}>
                {it}
              </li>
            ))}
          </Tag>
        );
      }
      case "quote":
        return (
          <figure
            key={i}
            className="border-l-4 border-gray-300 pl-4 md:pl-6 my-6 md:my-8"
          >
            <blockquote className="text-xl md:text-2xl italic text-gray-900">
              {block.text}
            </blockquote>
            {"cite" in block && block.cite && (
              <figcaption className="text-sm text-gray-600 mt-2">
                — {block.cite}
              </figcaption>
            )}
          </figure>
        );
      case "image":
        return (
          <figure key={i} className="my-8 md:my-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.src}
              alt={block.alt || ""}
              className="w-full h-auto rounded-xl shadow"
              width={block.width}
              height={block.height}
            />
            {block.caption && (
              <figcaption className="text-sm text-gray-600 mt-2 text-center">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );
      case "cta":
        return (
          <div key={i} className="text-center py-12">
            {block.title && (
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-chivo">
                {block.title}
              </h2>
            )}
            {block.body && (
              <p className="text-lg text-gray-700 mb-4">{block.body}</p>
            )}
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-red to-blue text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-full hover:opacity-90 transition-opacity duration-200"
            >
              {block.buttonLabel || "Join Free"}
            </Button>
          </div>
        );
      default:
        const _exhaustive: never = block;
        return _exhaustive;
    }
  };

  // ✅ Use top-level `data.image` if present, otherwise fall back to coverImage.src
  const heroSrc = data.image || data.coverImage?.src || "";
  const heroAlt = data.coverImage?.alt || data.title;

  return (
    <div className="min-h-screen bg-white">
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: heroHeight }}
      >
        {heroSrc && (
          <Image
            src={heroSrc || "/articles/hedda-1.jpg"}
            alt={heroAlt || "Article image"}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-16">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold text-white mb-2 md:mb-4 font-chivo">
              {data.title}
            </h1>
            {data.dek && (
              <p className="text-sm md:text-xl lg:text-2xl text-white/90 font-light">
                {data.dek}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        <div className="prose prose-base md:prose-lg lg:prose-xl max-w-none">
          {data.content?.map(renderBlock)}
        </div>
      </article>
    </div>
  );
}