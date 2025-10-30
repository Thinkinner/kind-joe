import { Suspense } from "react";
import Navbar from "@/components/navbar";
import LatestNews from "@/components/sections/latest-news";

// Server-side fetch (no cache to always get fresh news)
async function fetchNews() {
  const url = process.env.NEXT_PUBLIC_NEWS_JSON_URL || "/api/news";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { featured: undefined, articles: [] as any[] };
    const json = await res.json();
    return {
      featured: json.featured,
      articles: Array.isArray(json.articles) ? json.articles : [],
    };
  } catch {
    return { featured: undefined, articles: [] as any[] };
  }
}

export default function Home() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          typeof LatestNews?.Skeleton === "function" ? (
            <LatestNews.Skeleton />
          ) : null
        }
      >
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const data = await fetchNews();
  // Assumes LatestNews accepts { featured?, articles } props.
  // If your LatestNews wraps a grid, just pass these through to it.
  return <LatestNews featured={data.featured} articles={data.articles} />;
}
