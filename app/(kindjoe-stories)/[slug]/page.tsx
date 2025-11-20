import { db } from "@/db";
import { articles, users, articleCategories, categories } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/stories/article-single-page-content";
import type { Metadata } from "next";
import RelatedArticles from "@/components/stories/stories/related-articles";

export const revalidate = 60;

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
    <main className="mx-auto max-w-5xl px-4 lg:px-6 py-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] lg:gap-10">
        <article className="lg:border-r lg:border-neutral-200 lg:pr-8">
          <header className="lg:flex lg:items-start lg:gap-4 mb-6">
            <div className="hidden lg:block w-1.5 bg-red-600 rounded-full self-stretch" />
            <div className="flex-1">
              <h1 className="mt-4 lg:mt-0 text-2xl lg:text-4xl font-bold leading-tight tracking-tight">
                {a.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => (
                    <span
                      key={c.slug}
                      className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 font-semibold uppercase tracking-wide"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="overflow-hidden rounded-lg bg-neutral-100">
            <img
              src={a.coverImageUrl ?? "/placeholder.jpg"}
              alt={a.title ?? "Article cover image"}
              className="w-full h-full object-cover aspect-[16/9]"
              loading="lazy"
            />
          </div>

          <hr className="my-10 h-0.5 border-t-0 bg-neutral-200 dark:bg-white/10" />

          <div className="prose prose-neutral max-w-none">
            <ArticleContent value={content} />
          </div>
        </article>

        <aside className="mt-10 lg:mt-0 lg:pl-4">
          <div className="border border-neutral-200 rounded-lg p-4 lg:p-5 bg-neutral-50">
            <h2 className="text-sm font-semibold tracking-tight mb-3 uppercase text-neutral-600">
              Related Articles
            </h2>
            <RelatedArticles slug={slug} />
          </div>
        </aside>
      </div>
    </main>
  );
}
