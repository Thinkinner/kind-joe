// app/components/ArticleList.tsx
"use client";

import { useEffect, useState } from "react";
import { ArticleSummary } from "@/types/article";
import { ArticleCard } from "./article-card";

export function ArticleList() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/articles?limit=12");
        if (!res.ok) {
          throw new Error("Failed to fetch articles");
        }
        const data: ArticleSummary[] = await res.json();
        setArticles(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading articles…</p>;
  }

  if (articles.length === 0) {
    return <p className="text-sm text-gray-500">No articles yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
