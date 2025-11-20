"use client";
import React, { useEffect, useState } from "react";
import { NewsCard } from "@/components/ventura-county/news-card"; // Assuming this is your updated card
import { SocialWidget } from "@/components/ventura-county/social-widget";
import { ArticleCard } from "@/types/article";

const App: React.FC = () => {
  const [mainArticles, setMainArticles] = useState<ArticleCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Shape of the API response row
  type TopStoryRow = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
    publishAt: string | null;
    createdAt: string;
    readingMinutes: number | null;
    authorName: string | null;
    authorAvatarUrl: string | null;
    category: string;
  };

  // ------------------------
  // 👉 Fetch Ventura County Articles From API
  // ------------------------
  useEffect(() => {
    const fetchVenturaStories = async () => {
      try {
        const res = await fetch("/api/articles/ventura-county", {
          method: "GET",
          // If you want ISR / caching behavior, you can tweak this:
          // next: { revalidate: 60 },
        });

        if (!res.ok) {
          console.error("Failed to fetch Ventura County stories");
          setLoading(false);
          return;
        }

        const data: TopStoryRow[] = await res.json();

        // Map API rows → ArticleCard[]
        const allArticles: ArticleCard[] = data.map((row) => {
          // choose a date: publishedAt > publishAt > createdAt
          const date = row.publishedAt ?? row.publishAt ?? row.createdAt;

          return {
            id: row.id,
            headline: row.title,
            date,
            category: row.category,
            imageUrl: row.coverImageUrl ?? "/ventura-placeholder.jpg",
            summary: row.excerpt ?? "",
            // adjust this URL to match your article route (e.g. /articles/[slug] or /stories/[slug])
            url: `/ventura/${row.slug}`,
          };
        });

        // Decide how to split into main + sidebar
        const main = allArticles.slice(0, 10);
        const sidebar = allArticles.slice(4);

        setMainArticles(main);
      } catch (error) {
        console.error("Error fetching Ventura County stories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenturaStories();
  }, []);

  // ------------------------
  // Loading Screen
  // ------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-news-red border-t-transparent rounded-full animate-spin"></div>
          <div className="text-news-blue font-poppins font-medium animate-pulse">
            Loading Ventura County Stories...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <main className="p-4 md:p-6 lg:p-8">
        {/* <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-black text-xl md:text-3xl font-bold font-[Poppins]">
            Live Stocks Chart
          </div>
          <div className="text-blue-700 text-xs md:text-base font-bold font-[Poppins]">
            AS OF TODAY
          </div>
        </div>
        <RssStocksTicker stocks={stocks} /> */}
        <hr />
        <h1 className="text-black text-xl md:text-3xl font-bold font-[Poppins] mt-6 mb-6 " >Latest Ventura Articles</h1>
        <div className="flex flex-col lg:flex-row justify-start items-start gap-8">
          {/* Main Articles Section */}
          <div className="flex-1 w-full lg:w-[65%] xl:w-[75%] flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
              {mainArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="w-full lg:w-[35%] xl:w-[25%] lg:max-w-[420px] self-start">
            <div className="flex flex-col gap-8 lg:sticky lg:top-24">
              <SocialWidget />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
