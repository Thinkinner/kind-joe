import { Suspense } from "react";
import LatestNews from "@/components/sections/latest-news";
import { listArticles } from "@/db/queries/articles";
import type { Article } from "@/types/article";

export const revalidate = 60; // ISR

// --- Helpers (inline; no separate mapper) ---
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
  const rows = await listArticles(); // your Drizzle query
  const items = rows.map(toCard);
  const [featured, ...articles] = items;
  return { featured, articles };
}

export default function Home() {
  return (
    <Suspense fallback={typeof LatestNews?.Skeleton === "function" ? <LatestNews.Skeleton /> : null}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const data = await fetchNews();

  return (
    <LatestNews
      featured={data.featured}
      articles={data.articles}
    />
  );
}
