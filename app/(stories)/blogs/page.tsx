"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { articlesData } from "@/data/articlesData"; // your JSON articles

export default function BlogGrid() {
  return (
    <>
      {/* Header Section */}
      <section className="text-center py-10">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
          Latest News & Articles
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          News & Articles
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto px-5">
          Discover the newest stories, features, and insights from our team.
        </p>
      </section>

      {/* Grid Section */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="relative border-t border-b border-r border-l border-gray-200">
          {/* Center divider (for desktop view) */}
          <div className="hidden lg:block absolute inset-y-0 left-1/2 w-px bg-gray-200 transform -translate-x-1/2" />

          {/* Articles Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {articlesData.map((article, idx) => (
              <article key={article.slug || idx} className="relative group p-5 border">
                <Card className="bg-white shadow-none border-0">

                  {/* Article Image */}
                  <div className="overflow-hidden">
                    <Link href={`/blogs/${article.slug}`} className="block">
                      <Image
                        src={
                          article.image?.startsWith("http")
                            ? article.image // ✅ External image (Google Cloud, S3)
                            : article.image || "/placeholder.jpg" // ✅ Local / fallback
                        }
                        alt={article.title}
                        width={1500}
                        height={640}
                        unoptimized={article.image?.startsWith("http")} // ✅ allows non-optimized external URLs
                        className="object-cover w-full h-56 sm:h-64 lg:h-56 group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  </div>

                  {/* Article Content */}
                  <CardContent className="p-6">
                    <CardHeader className="p-0 mb-2">
                      <CardTitle className="text-lg font-semibold leading-tight">
                        <Link
                          href={`/blogs/${article.slug}`}
                          className="block hover:underline font-bold"
                        >
                          {article.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}