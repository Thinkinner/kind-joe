"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RelatedArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  publishAt: string | null;
  readingMinutes: number | null;
};

type ApiResponse =
  | { items: RelatedArticle[] }
  | { error: string };

interface RelatedArticlesProps {
  slug: string;
  className?: string;
  title?: string;
}

export default function RelatedArticles({
  slug,
  className,
  title = "Related Articles",
}: RelatedArticlesProps) {
  const [items, setItems] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/articles/${slug}/related`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: ApiResponse = await res.json();

        if ("error" in data) {
          throw new Error(data.error);
        }

        if (!cancelled) {
          setItems(data.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load related articles", err);
          setError("Unable to load related articles.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <aside className={className}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div className="space-y-3">
          <div className="h-24 rounded-md bg-neutral-100 animate-pulse" />
          <div className="h-24 rounded-md bg-neutral-100 animate-pulse" />
          <div className="h-24 rounded-md bg-neutral-100 animate-pulse" />
        </div>
      </aside>
    );
  }

  if (error || items.length === 0) {
    // You can hide this entire block if you prefer no sidebar when empty.
    return null;
  }

  return (
    <aside className={className}>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((item) => (
          <RelatedArticleCard key={item.id} article={item} />
        ))}
      </div>
    </aside>
  );
}

function RelatedArticleCard({ article }: { article: RelatedArticle }) {
  const href = `/stories/${article.slug}`; // adjust if your route is different

  const date =
    article.publishedAt ??
    article.publishAt ??
    null;

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-red-500 hover:bg-neutral-50"
    >
      {article.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
        />
      ) : null}

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-red-600">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
            {article.excerpt}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
          {formattedDate && <span>{formattedDate}</span>}
          {article.readingMinutes ? (
            <>
              <span>•</span>
              <span>{article.readingMinutes} min read</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
