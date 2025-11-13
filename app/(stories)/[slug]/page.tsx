import { db } from "@/db";
import { articles, users, articleCategories, categories } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/stories/article-single-page-content";
import type { Metadata } from "next";
import ShareButton from "@/components/rss-news/share-button";

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
    <main className="mx-auto max-w-4xl lg:p-6">
      <article>
        <header>
          <div className="hidden lg:flex items-start gap-4 mb-6">
            <div className="w-3 bg-red-600 self-stretch"></div>

            <h1 className="text-2xl lg:text-4xl font-bold leading-tight tracking-tight">
              {a.title}
            </h1>
          </div>

          <img
            src={a.coverImageUrl ?? ""}
            alt={a.coverImageUrl ?? ""}
            className="w-full lg:rounded-lg"
          />
          <div className="lg:hidden flex items-start gap-4 mt-6 px-4">
            <h1 className="text-2xl lg:text-4xl font-bold leading-tight tracking-tight">
              {a.title}
            </h1>
          </div>
          {/* Mobile */}
          <div className="flex items-center gap-2 lg:gap-2 flex-wrap mt-5 px-4">
            {cats.map((c) => (
              <span
                key={c.slug}
                className="uppercase rounded-sm font-medium tracking-tight"
              >
                {c.name}
              </span>
            ))}

            <span className="uppercase rounded-sm font-medium tracking-tight">
              |
            </span>

            {date && (
              <>
                Published{" "}
                {new Date(String(date)).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}

            <div className="lg:ml-auto">
              <ShareButton />
            </div>
          </div>
          {/* Comment out */}
          <div>
            {/* <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
            {a.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.authorAvatar}
                alt={a.authorName ?? "author"}
                className="w-8 h-8 rounded-full border"
              />
            ) : null}
            <div>{a.authorName}</div>
            {cats.length ? (
              <>
                <span>•</span>
              </>
            ) : null}
          </div> */}
          </div>
        </header>
        <hr className="my-10 h-0.5 border-t-0 bg-neutral-200 dark:bg-white/10 " />
        <div className="px-4">
          <ArticleContent value={content} />
        </div>
      </article>
    </main>
  );
}
