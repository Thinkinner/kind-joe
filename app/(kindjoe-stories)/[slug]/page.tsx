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
              {/* Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
                {cats.length > 0 && (
                  <span className="bg-red-600 text-white px-2 py-0.5 font-semibold rounded-sm">
                    {cats[0].name}
                  </span>
                )}
                <span className="h-3 w-px bg-neutral-300" />
                <span>Home</span>
                <span className="text-neutral-300">/</span>
                <span>{cats.length > 0 ? cats[0].name : "Category"}</span>
              </div>

              {/* Title */}
              <h1 className="mt-4 text-2xl lg:text-[36px] font-extrabold leading-tight tracking-tight text-neutral-900">
                {a.title}
              </h1>

              {/* Tags */}
              {cats.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cats.slice(1).map((c) => (
                    <span
                      key={c.slug}
                      className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-600 hover:bg-neutral-200 transition"
                    >
                      #{c.name}
                    </span>
                  ))}
                </div>
              )}

              {/* --- NEW: PUBLISHER & LOGO SECTION --- */}
              <div className="mt-6 mb-6 flex items-center justify-between border-y border-neutral-100 py-4">
                <div className="flex items-center gap-3">
                  {/* Logo Container */}
                  <div className="relative h-12 w-12 flex-shrink-0">
                    {/* Replace src with your actual logo path */}
                    <img
                      src="https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691cf02c6a5d3b0cfda50cf9.png"
                      alt="The Kind Joe Logo"
                      className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                    {/* Verified Badge Icon */}
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Publisher Text Info */}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-900 leading-none">
                      The Kind Joe
                    </span>
                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                      <span>Official Publisher</span>
                      <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                      {/* <span>{a.publishedAt ?? "Nov 21, 2025"}</span> */}
                    </div>
                  </div>
                </div>

                {/* Optional Follow Button */}
                {/* <div className="hidden sm:block">
                  <button className="rounded-full bg-neutral-900 px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-neutral-700 hover:shadow-md">
                    Follow
                  </button>
                </div> */}
              </div>
              {/* ----------------------------------- */}

              {/* Social bar */}
              <div className="flex items-center gap-2">
                <span className="mr-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Share Article
                </span>

                {/* Tiktok */}
                <a
                  href={`https://www.tiktok.com/@thekind.joe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-black hover:text-white transition-all"
                >
                  <FaTiktok className="h-3.5 w-3.5" />
                </a>

                {/* Twitter/X */}
                <a
                  href={`https://x.com/TheKindJoe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-black hover:text-white transition-all"
                >
                  <FaXTwitter className="h-3.5 w-3.5" />
                </a>

                {/* Instagram */}
                <a
                  href={`https://www.instagram.com/thekindjoe/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-[#cb2027] hover:text-white transition-all"
                >
                  <FaInstagram className="h-3.5 w-3.5" />
                </a>

                {/* Youtube */}
                <a
                  href={`https://www.youtube.com/@thekindjoe-w4d`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-[#FF0000] hover:text-white transition-all"
                >
                  <FaYoutube className="h-3.5 w-3.5" />
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/thekindjoe`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-[#1877F2] hover:text-white transition-all"
                >
                  <FaFacebook className="h-3.5 w-3.5" />
                </a>
              </div>
            </header>

            {/* Hero image */}
            <div className="mt-4 lg:mt-6 px-4 lg:px-6">
              <div className="overflow-hidden rounded-xl shadow-sm">
                <img
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title ?? "Article cover image"}
                  className="w-full h-full object-cover aspect-[16/9]"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Article body */}
            <div className="mt-8 px-4 lg:px-6">
              <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-red-600">
                <ArticleContent value={content} />
              </div>
            </div>
          </article>

          {/* SIDEBAR */}
          <aside className="mt-8 lg:mt-0 space-y-8">
            {/* Newsletter box */}
            <section className="mx-4 lg:mx-0 rounded-2xl bg-neutral-50 border border-neutral-100 p-6 text-center">
              <h2 className="text-sm font-extrabold tracking-tight uppercase text-neutral-900">
                Join the Community
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Get the latest stories delivered straight to your inbox.
              </p>
              <form className="mt-4 space-y-2">
                <input
                  type="email"
                  placeholder="Your Email Address"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-red-700"
                >
                  Subscribe Free
                </button>
              </form>
            </section>

            {/* Ad banner / promo */}
            <section className="px-4 lg:px-0">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-red-300 shadow-xl shadow-red-500/20">
                <div className="relative p-8 text-white">
                  {/* Background circles */}
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"></div>
                  <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>

                  <div className="">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md text-white border border-white/20 w-fit">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      New Episodes
                    </div>

                    <h3 className="text-2xl font-black leading-tight">
                      Don't Miss <br />the Action
                    </h3>

                    <p className="mt-3 text-sm font-medium text-red-50">
                      Exclusive new stories are streaming now on our channel.
                    </p>

                    <a
                      href="https://www.youtube.com/@thekindjoe-w4d"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-blue-600 shadow-md transition hover:bg-neutral-100"
                    >
                      <span>Watch Now</span>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Related / You Might Also Like */}
            <section className="px-4 lg:px-0">
              <h3 className="mb-4 border-b border-neutral-200 pb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
                Recommended
              </h3>
              <div className="space-y-4">
                <RelatedArticles slug={slug} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
