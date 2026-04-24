export default function DevelopersGettingStartedPage() {
  return (
    <article className="prose prose-slate prose-headings:scroll-mt-24 max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <h1>Getting Started</h1>
      <p>
        KindJoe developer APIs are designed for read-only content consumption. The fastest way to
        start is to fetch Ventura stories and render them in your own feed or content modules.
      </p>

      <div className="not-prose mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Quick start</p>
        <p className="mt-1">
          Call the Ventura endpoint, render basic fields, then link back to the canonical story.
        </p>
      </div>

      <h2>1) Base URL</h2>
      <p>Use the production base URL:</p>
      <pre>
        <code>https://kindjoe.com/api</code>
      </pre>

      <h2>2) Fetch Ventura stories</h2>
      <p>Call the Ventura stories endpoint and render title, excerpt, image, and link.</p>
      <pre>
        <code>{`curl "https://kindjoe.com/api/articles/ventura-county"`}</code>
      </pre>

      <h2>3) Build article links</h2>
      <p>
        For Ventura posts, create links as <code>https://kindjoe.com/ventura/:slug</code> to point
        users back to the canonical source.
      </p>

      <h2>4) Cache responses</h2>
      <p>
        Cache API responses on your side to reduce repeated calls and improve page speed. If you
        poll, use a sensible refresh interval instead of aggressive re-fetching.
      </p>

      <h2>5) Read-only usage</h2>
      <p>
        These endpoints are read-only for partners. You can display content, but cannot create,
        edit, or delete posts through this integration.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li>Read the Ventura endpoint details in the API reference.</li>
        <li>Add response caching in your app for better performance.</li>
        <li>Track integration updates on the changelog page.</li>
      </ul>
    </article>
  );
}
