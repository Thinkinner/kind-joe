// app/articles/page.tsx
import Link from 'next/link';
import { db } from '@/db';
import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { articles, categories, tags, articleCategories, articleTags } from '@/db/schema';
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";

export const revalidate = 60;

type SearchParams = {
  q?: string | string[];
  category?: string | string[];
  tag?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

// helpers
const one = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const toInt = (v: string | string[] | undefined, fallback: number) => {
  const n = parseInt(one(v) ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

// published filter
function publishedWhere(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`( ${articles.publishedAt} IS NOT NULL AND ${articles.publishedAt} <= ${now} )
      OR ( ${articles.publishedAt} IS NULL AND ${articles.publishAt} IS NOT NULL AND ${articles.publishAt} <= ${now} )`
  );
}

export default async function ArticlesPage({
  // NOTE: Next 16 — searchParams is a Promise
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams; // 👈 unwrap it

  const page = Math.max(toInt(sp.page, 1), 1);
  const pageSize = Math.min(Math.max(toInt(sp.pageSize, 20), 1), 100);
  const q = one(sp.q) ?? '';
  const categorySlug = one(sp.category);
  const tagSlug = one(sp.tag);
  const now = new Date();

  const baseWhere = publishedWhere(now);
  const textWhere = q
    ? ilike(sql`${articles.title} || ' ' || coalesce(${articles.excerpt}, '')`, `%${q}%`)
    : undefined;

  const categoryWhere = categorySlug
    ? sql<boolean>`EXISTS (
        SELECT 1
        FROM ${articleCategories} ac
        JOIN ${categories} c ON c.id = ac.categoryId
        WHERE ac.article_id = ${articles.id}
          AND c.slug = ${categorySlug}
      )`
    : undefined;

  const tagWhere = tagSlug
    ? sql<boolean>`EXISTS (
        SELECT 1
        FROM ${articleTags} at
        JOIN ${tags} t ON t.id = at.tagId
        WHERE at.article_id = ${articles.id}
          AND t.slug = ${tagSlug}
      )`
    : undefined;

  const fullWhere = and(baseWhere, textWhere, categoryWhere, tagWhere);

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      category: articles.category,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(fullWhere)
    .orderBy(desc(articles.publishedAt), desc(articles.publishAt), desc(articles.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(fullWhere);

  const total = Number(count);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const withPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categorySlug) params.set('category', categorySlug);
    if (tagSlug) params.set('tag', tagSlug);
    params.set('pageSize', String(pageSize));
    params.set('page', String(p));
    return `/articles?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Articles</h1>

      <JoesFriendsPromo variant="banner" className="mb-6" />

      <form action="/articles" className="flex gap-2 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title/excerpt…"
          className="border rounded px-3 py-2 w-full"
        />
        <button className="border rounded px-3 py-2">Search</button>
      </form>

      {rows.length === 0 ? (
        <p className="text-gray-500">No articles found.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rows.map((a) => {
            const date = a.publishedAt ?? a.publishAt ?? a.createdAt;
            return (
              <li key={a.id} className="rounded-2xl border p-4 hover:shadow-sm transition">
                <div className="text-xs opacity-60 mb-1">
                  {date ? new Date(String(date)).toLocaleString() : null}
                </div>
                <h2 className="text-lg font-medium leading-snug">
                  <Link href={`/${a.slug}`} className="hover:underline">
                    {a.title}
                  </Link>
                </h2>
                {a.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optimizeCloudinaryUrl(a.coverImageUrl, { width: 1200 })}
                    alt={a.title}
                    className="w-full h-48 object-cover rounded-xl mt-3"
                  />
                ) : null}
                {a.excerpt ? <p className="text-sm mt-3 line-clamp-3">{a.excerpt}</p> : null}
                <div className="mt-3 text-xs text-gray-500">{a.category}</div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-3 mt-8">
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages} — {total} total
        </span>
        <div className="ml-auto flex gap-2">
          {page > 1 && (
            <Link href={withPage(page - 1)} className="border rounded px-3 py-1">
              Prev
            </Link>
          )}
          {page < totalPages && (
            <Link href={withPage(page + 1)} className="border rounded px-3 py-1">
              Next
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
