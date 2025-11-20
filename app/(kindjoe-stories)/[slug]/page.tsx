import { db } from "@/db";
import { articles, users, articleCategories, categories } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/stories/article-single-page-content";
import type { Metadata } from "next";
import RelatedArticles from "@/components/stories/stories/related-articles";

export const revalidate = 60;

import {
  FaFacebookF,
  FaXTwitter,
  FaPinterestP,
  FaLinkedinIn,
  FaTiktok,
  FaInstagram,
  FaYoutube,
  FaFacebook,
} from "react-icons/fa6";


function publishedWhere(slug: string, now = new Date()) {
  return and(
    eq(articles.slug, slug),
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`
      (
        ${articles.publishedAt} IS NOT NULL
        AND ${articles.publishedAt} <= ${now}
      )
      OR (
        ${articles.publishedAt} IS NULL
        AND ${articles.publishAt} IS NOT NULL
        AND ${articles.publishAt} <= ${now}
      )
    `
  );
}

// ✅ Use the article's seo JSON object if present
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;

  const row = await db
    .select({
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      seo: articles.seo,
    })
    .from(articles)
    .where(publishedWhere(slug))
    .limit(1);

  const a = row[0];
  if (!a) return {};

  // Parse SEO JSON if stored as string
  const seo =
    typeof a.seo === "string"
      ? (JSON.parse(a.seo) as Record<string, any>)
      : (a.seo as Record<string, any> | null);

  const title = seo?.title || a.title;
  const description = seo?.description || a.excerpt || undefined;
  const canonical = seo?.canonical || undefined;
  const image = a.coverImageUrl ? [a.coverImageUrl] : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical || undefined,
      images: image,
      type: "article",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image,
    },
  };
}

export default async function ArticleBySlug(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const now = new Date();

  const row = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      category: articles.category,
      authorId: articles.authorId,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      content: articles.content,
      seo: articles.seo,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(articles)
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(publishedWhere(slug, now))
    .limit(1);

  const a = row[0];
  if (!a) notFound();

  const cats = await db
    .select({ name: categories.name, slug: categories.slug })
    .from(articleCategories)
    .leftJoin(categories, eq(categories.id, articleCategories.categoryId))
    .where(eq(articleCategories.articleId, a.id));

  const date = a.publishedAt ?? a.publishAt ?? a.createdAt;

  const content =
    typeof a.content === "string"
      ? (JSON.parse(a.content) as any)
      : (a.content as any);

  return (
    <main className="py-8">
      <div className="mx-auto max-w-6xl px-4 lg:px-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(260px,1.4fr)] lg:gap-8">
          {/* MAIN ARTICLE */}
          <article className="lg:pb-8">
            {/* Top meta bar */}
            <header className="px-4 lg:px-6 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-neutral-500">
                {/* Left: section / breadcrumbs */}
                <div className="flex flex-wrap items-center gap-2">
                  {cats.length > 0 && (
                    <span className=" bg-red-600 text-white px-2 py-0.5 font-semibold">
                      {cats[0].name}
                    </span>
                  )}

                  <span className="h-3 w-px bg-neutral-300" />

                  <span>Home</span>
                  <span className="text-neutral-300">/</span>

                  {/* DYNAMIC CATEGORY */}
                  <span>{cats.length > 0 ? cats[0].name : "Category"}</span>
                </div>

                {/* Right: author / date / comments */}
                {/* <div className="flex flex-wrap items-center gap-3">
                  <span>By {a.author ?? "Author"}</span>
                  <span className="h-3 w-px bg-neutral-300" />
                  <span>{a.publishedAt ?? "30 September 2014"}</span>
                  <span className="h-3 w-px bg-neutral-300" />
                  <span>{a.commentCount ?? 0} Comments</span>
                </div> */}
              </div>

              {/* Title */}
              <h1 className="mt-3 text-2xl lg:text-[32px] font-bold leading-tight tracking-tight text-neutral-900">
                {a.title}
              </h1>

              {/* Optional tags row under title */}
              {cats.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {cats.slice(1).map((c) => (
                    <span
                      key={c.slug}
                      className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Social bar */}
              <div className="mt-4 flex items-center gap-3">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Share
                </span>

                {/* Tiktok */}
                <a
                  href={`https://www.tiktok.com/@thekind.joe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#3b5998] text-white hover:opacity-90 transition"
                >
                  <FaTiktok className="h-4 w-4" />
                </a>

                {/* Twitter/X */}
                <a
                  href={`https://x.com/TheKindJoe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-black text-white hover:opacity-90 transition"
                >
                  <FaXTwitter className="h-4 w-4" />
                </a>

                {/* Instagram */}
                <a
                  href={`https://www.instagram.com/thekindjoe/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#cb2027] text-white hover:opacity-90 transition"
                >
                  <FaInstagram className="h-4 w-4" />
                </a>

                {/* Youtube */}
                <a
                  href={`https://www.youtube.com/@thekindjoe-w4d`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0077b5] text-white hover:opacity-90 transition"
                >
                  <FaYoutube className="h-4 w-4" />
                </a>

                
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/thekindjoe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0077b5] text-white hover:opacity-90 transition"
                >
                  <FaFacebook className="h-4 w-4" />
                </a>
              </div>
            </header>

            {/* Hero image */}
            <div className="mt-4 lg:mt-6 px-4 lg:px-6">
              <div className="overflow-hidden rounded-sm">
                <img
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title ?? "Article cover image"}
                  className="w-full h-full object-cover aspect-[16/9]"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Article body */}
            <div className="mt-6 px-4 lg:px-6">
              <div className="prose prose-neutral max-w-none">
                <ArticleContent value={content} />
              </div>
            </div>
          </article>

          {/* SIDEBAR */}
          <aside className="mt-8 lg:mt-0 space-y-6">
            {/* Newsletter box */}
            <section className="px-4 py-5">
              <h2 className="text-sm font-bold tracking-tight uppercase text-neutral-800">
                Get Newsletter
              </h2>
              <p className="mt-2 text-xs text-neutral-600">
                Sign up to receive the latest news, articles and updates.
              </p>
              <form className="mt-3 space-y-2">
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full rounded border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
                >
                  Subscribe
                </button>
              </form>
            </section>

            {/* Ad banner / promo */}
            <section className="px-4 py-5">
              <div className="h-24 w-full border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-500">
                Ad Space / Promo Banner
              </div>
            </section>

            {/* Related / You Might Also Like */}
            <section className="px-4 py-5">
              <div className="mt-3 space-y-3">
                {/* Reuse your existing component, it will render list items */}
                <RelatedArticles slug={slug} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
