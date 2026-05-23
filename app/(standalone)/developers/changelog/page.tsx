export default function DevelopersChangelogPage() {
  return (
    <article className="max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Changelog</h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">
          Track updates to the Developer.KindJoe docs and public API integration behavior.
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Update cadence</p>
        <p className="mt-1">
          This page is updated whenever docs structure or public API usage changes.
        </p>
      </div>

      <section className="mt-8 border-l-2 border-slate-200 pl-5">
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-700">
          2026-05-23
        </p>

        <div className="mt-4 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">KindJoe post cards documentation</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              <li>Published internal reference for `posts` schema and article editor integration.</li>
              <li>Added feed indexes and scoped admin click aggregation for lower DB cost.</li>
              <li>Added `npm run db:seed-posts` helper for a single sample feed tile.</li>
              <li>Removed `article_pageviews` and in-app view tracking; admin dashboard is content-focused.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-8 border-l-2 border-slate-200 pl-5">
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-700">
          2026-04-23
        </p>

        <div className="mt-4 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Developer docs portal launched</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              <li>Added Developer.KindJoe documentation layout with sidebar navigation.</li>
              <li>Published Getting Started and Ventura Content API reference pages.</li>
              <li>Added changelog page for future platform and docs updates.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">Ventura Content API documentation</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              <li>Documented `GET /api/articles/ventura-county` endpoint.</li>
              <li>Documented `GET /api/articles/:slug/related` endpoint.</li>
              <li>Clarified read-only usage for partner integrations.</li>
            </ul>
          </div>
        </div>
      </section>
    </article>
  );
}
