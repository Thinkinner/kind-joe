import Link from "next/link";
import { searchArticles } from "@/lib/actions/search";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const hasQuery = query.length >= 2;
  const results = hasQuery ? await searchArticles(query) : [];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Search
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Browse articles by topic, title, or category.
          </p>
        </header>

        <form action="/search" method="get" className="mb-8">
          <label htmlFor="search-input" className="sr-only">
            Search query
          </label>
          <div className="flex gap-3">
            <input
              id="search-input"
              name="q"
              defaultValue={query}
              placeholder="Search stories, topics, categories..."
              className="h-11 flex-1 rounded-lg border border-slate-300 px-4 text-sm outline-none transition focus:border-red-500"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </form>

        {!hasQuery ? (
          <p className="text-sm text-slate-600">
            Enter at least 2 characters to search.
          </p>
        ) : results.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            No results found for{" "}
            <span className="font-semibold text-slate-900">&ldquo;{query}&rdquo;</span>.
          </div>
        ) : (
          <section aria-label="Search results">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <ul className="space-y-3">
              {results.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/${article.slug}`}
                    className="block rounded-lg border border-slate-200 p-4 transition hover:border-red-300 hover:bg-red-50/40"
                  >
                    <h2 className="text-base font-semibold text-slate-900">
                      {article.title}
                    </h2>
                    {article.excerpt ? (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                        {article.excerpt}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {article.category ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5">
                          {article.category}
                        </span>
                      ) : null}
                      {article.authorName ? <span>{article.authorName}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
