export default function VenturaContentApiDocsPage() {
  return (
    <article className="prose prose-slate prose-headings:scroll-mt-24 max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <h1>Ventura Content API</h1>
      <p>
        The Ventura Content API allows partner websites to fetch and display Ventura stories from
        KindJoe. This integration is read-only.
      </p>

      <div className="not-prose mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Endpoint status</p>
        <p className="mt-1">Public read access. No write endpoints are exposed for partners.</p>
      </div>

      <h2>Endpoint: list Ventura stories</h2>
      <pre>
        <code>GET /api/ventura/articles</code>
      </pre>
      <p>
        Returns published Ventura-tagged stories, ordered newest first by publish timestamp.
      </p>

      <h3>Example request</h3>
      <pre>
        <code>{`curl "https://kindjoe.com/api/ventura/articles"`}</code>
      </pre>

      <h3>Example response</h3>
      <pre>
        <code>{`[
  {
    "id": "9c32b8e6-24e7-4f88-9b0f-8d3901f4e881",
    "slug": "ventura-housing-update",
    "title": "Ventura Housing Update",
    "excerpt": "What changed this week in Ventura County housing.",
    "category": "local-news",
    "coverImageUrl": "https://cdn.example.com/ventura.jpg",
    "publishedAt": "2026-04-20T15:40:00.000Z",
    "publishAt": null,
    "createdAt": "2026-04-20T14:55:00.000Z",
    "readingMinutes": 4,
    "authorAlias": "Joe Ventura",
    "authorName": "Joseph Smith",
    "authorAvatarUrl": "https://cdn.example.com/avatar.png"
  }
]`}</code>
      </pre>

      <h2>Endpoint: Ventura article detail by slug</h2>
      <pre>
        <code>GET /api/ventura/articles/:slug</code>
      </pre>
      <p>Returns full article payload for rendering editorial pages.</p>

      <h3>Example request</h3>
      <pre>
        <code>{`curl "https://kindjoe.com/api/ventura/articles/ventura-housing-update"`}</code>
      </pre>

      <h3>Example response</h3>
      <pre>
        <code>{`{
  "id": "9c32b8e6-24e7-4f88-9b0f-8d3901f4e881",
  "slug": "ventura-housing-update",
  "title": "Ventura Housing Update",
  "excerpt": "What changed this week in Ventura County housing.",
  "coverImageUrl": "https://cdn.example.com/ventura.jpg",
  "category": "local-news",
  "authorId": "staff_123",
  "authorAlias": "Joe Ventura",
  "authorName": "Joseph Smith",
  "authorAvatar": "https://cdn.example.com/avatar.png",
  "contentMarkdown": "### LEDE\\n\\nFull editorial body in markdown...\\n\\n### THE OTHER SIDE\\n\\nOpposing view...",
  "contentHtml": "<p>...</p>",
  "content": {},
  "publishedAt": "2026-04-20T15:40:00.000Z",
  "publishAt": null,
  "createdAt": "2026-04-20T14:55:00.000Z",
  "updatedAt": "2026-04-20T15:41:00.000Z",
  "readingMinutes": 4,
  "categories": [{ "id": 1, "name": "Local News", "slug": "local-news" }],
  "tags": [{ "id": 12, "name": "Ventura County", "slug": "ventura-county" }],
  "linkedPrediction": null
}`}</code>
      </pre>

      <h2>Endpoint: related stories by slug</h2>
      <pre>
        <code>GET /api/articles/:slug/related</code>
      </pre>
      <p>Returns related published stories for a specific source slug.</p>

      <h3>Example request</h3>
      <pre>
        <code>{`curl "https://kindjoe.com/api/articles/ventura-housing-update/related"`}</code>
      </pre>

      <h3>Example response</h3>
      <pre>
        <code>{`{
  "items": [
    {
      "id": "5724d7cc-24ce-4a5a-9ac5-ee9f9fe5a83d",
      "slug": "ventura-interest-rates",
      "title": "How Interest Rates Are Affecting Ventura",
      "excerpt": "A quick breakdown of this week's changes.",
      "coverImageUrl": "https://cdn.example.com/rates.jpg",
      "publishedAt": "2026-04-18T12:00:00.000Z",
      "publishAt": null,
      "readingMinutes": 3
    }
  ]
}`}</code>
      </pre>

      <h2>Availability and filtering</h2>
      <ul>
        <li>Only non-draft, non-deleted, published articles are returned.</li>
        <li>Ventura list endpoint filters to posts tagged with `ventura-county`.</li>
        <li>`GET /api/articles/ventura-county` remains available as a compatibility alias.</li>
        <li>Author fields come from the current writer profile (`authorName` + `authorAlias`).</li>
        <li>Related endpoint returns HTTP 404 if the source slug is not published.</li>
      </ul>

      <h2>Read-only policy</h2>
      <p>
        Partner integrations can only read and display content. No public create, update, or
        delete API methods are available for Ventura stories.
      </p>

      <h2>Integration checklist</h2>
      <ul>
        <li>Fetch from `GET /api/ventura/articles` for Ventura lists.</li>
        <li>
          Fetch full editorial body from `GET /api/ventura/articles/:slug` using
          `contentMarkdown` (resolved from stored markdown with legacy jsonb/html
          fallback).
        </li>
        <li>Link users to canonical story URLs using each article slug.</li>
        <li>Cache API responses and avoid aggressive request polling.</li>
      </ul>
    </article>
  );
}
