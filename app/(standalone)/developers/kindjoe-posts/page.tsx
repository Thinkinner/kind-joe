export default function KindJoePostsDocsPage() {
  return (
    <article className="max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          KindJoe post cards
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">
          Image tiles on <code className="text-sm">/posts</code> that link out to stories and
          other URLs. They are separate from CMS <strong>articles</strong> and from community{" "}
          <strong>social posts</strong>.
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Database: `posts`</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Column</th>
                <th className="px-4 py-2">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">id</td>
                <td className="px-4 py-2">Serial primary key</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">image_url</td>
                <td className="px-4 py-2">Cloudinary (or other) tile image</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">destination_url</td>
                <td className="px-4 py-2">
                  Outbound link — usually <code className="text-xs">https://www.kindjoe.com/{"{slug}"}</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">caption</td>
                <td className="px-4 py-2">Optional label</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">is_pinned</td>
                <td className="px-4 py-2">Pinned tiles sort first</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">order</td>
                <td className="px-4 py-2">Manual sort within the feed</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">is_active</td>
                <td className="px-4 py-2">Soft hide without deleting</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">created_at</td>
                <td className="px-4 py-2">Created timestamp</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600">
          There is no foreign key to <code className="text-xs">articles</code>. The link to a story
          is only the <code className="text-xs">destination_url</code> string. Ventura and
          JoeKnowsLA use parallel tables: <code className="text-xs">ventura_posts</code>,{" "}
          <code className="text-xs">joeknowsla_posts</code>.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Articles editor integration</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Save or publish an article in the admin CMS.</li>
          <li>
            After the first successful create, a modal prompts you to upload a tile image.
          </li>
          <li>
            The app builds <code className="text-xs">destination_url</code> from the article slug
            (Ventura category/tag → <code className="text-xs">/ventura/{"{slug}"}</code>, else{" "}
            <code className="text-xs">/{"{slug}"}</code>).
          </li>
          <li>
            It POSTs to <code className="text-xs">/api/admin/posts</code> (or Ventura equivalent).
          </li>
          <li>
            On an existing article, use <strong>Open Post Modal</strong> in the editor toolbar.
          </li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Public feed</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Server page <code className="text-xs">/posts</code> loads at most 50 active cards in
            one query (indexed feed sort).
          </li>
          <li>
            <code className="text-xs">StandalonePostsFeed</code> paginates in the browser (12 per
            “load more”) — no extra database round-trips.
          </li>
          <li>Clicks open <code className="text-xs">destination_url</code> in a new tab.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Cost controls</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Composite index <code className="text-xs">posts_feed_idx</code> on active feed columns.
          </li>
          <li>
            Legacy DB analytics tables (`clicks`, `visitor_journey_events`, `article_pageviews`)
            were removed; traffic uses Vercel Web Analytics instead.
          </li>
          <li>
            Run <code className="text-xs">npm run db:audit</code> periodically on Neon to watch
            table growth (embeddings and RSS tables are the largest cost drivers, not post cards).
          </li>
        </ul>
      </section>
    </article>
  );
}
