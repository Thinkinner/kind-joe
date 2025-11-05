// src/app/page.tsx
import { Suspense } from "react";
import LatestNews from "@/components/sections/latest-news";
import { listArticles } from "@/db/queries/articles";
import type { Article } from "@/types/article";

export const revalidate = 60; // ISR

// --- Map DB rows into Article props ---
function toCard(r: any): Article {
  const cover = (r.coverImage ?? {}) as { src?: string | null; alt?: string | null };

  return {
    id: r.id,
    title: r.title,
    category: r.category ?? "General",
    imageSrc: cover.src ?? undefined,
    href: `/${r.slug}`,
    date: r.publishedAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(r.publishedAt))
      : "",
    readTime: r.readingMinutes ? `${r.readingMinutes} min read` : undefined,
  };
}

async function fetchNews() {
  const rows = await listArticles();

  // ✅ Sort by newest first (descending)
  rows.sort((a: any, b: any) => {
    const dateA = new Date(a.publishedAt || a.updatedAt || 0).getTime();
    const dateB = new Date(b.publishedAt || b.updatedAt || 0).getTime();
    return dateB - dateA;
  });

  const items = rows.map(toCard);
  const [featured, ...articles] = items;
  return { featured, articles };
}

export default function Home() {
  return (
    <Suspense
      fallback={
        typeof LatestNews?.Skeleton === "function" ? <LatestNews.Skeleton /> : null
      }
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const data = await fetchNews();
  return <LatestNews featured={data.featured} articles={data.articles} />;
}
