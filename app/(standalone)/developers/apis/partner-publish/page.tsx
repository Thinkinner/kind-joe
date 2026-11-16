import Link from "next/link";

export default function PartnerPublishApiDocsPage() {
  return (
    <article className="prose prose-slate prose-headings:scroll-mt-24 max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <h1>Partner Publish API (Hope)</h1>
      <p>
        Server-to-server endpoint for partner apps to publish a <strong>live article</strong> and
        matching <strong>post card</strong> in one call. No Kind Joe staff session required.
      </p>

      <div className="not-prose mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Status</p>
        <p className="mt-1">
          <code>POST /api/partner/publish</code> is an <strong>upsert</strong>. New slug → create
          (201). Existing slug → update in place (200). Works for every article, including CMS /
          Daily Brief stories. Title changes do not rename the slug. Deploy with{" "}
          <code>HOPE_PUBLISH_API_KEY</code> set in production.
        </p>
      </div>

      <h2>Endpoints</h2>
      <ul>
        <li>
          <code>POST /api/partner/upload-image</code> — store the photo and get the hero and square links
        </li>
        <li>
          <code>POST /api/partner/publish</code> — create the live article
        </li>
        <li>
          <code>PATCH /api/partner/articles/{"{slug}"}</code> — edit an existing article
        </li>
      </ul>

      <h2>Authentication</h2>
      <p>
        Same secret on Kind Joe and Hope (<code>HOPE_PUBLISH_API_KEY</code>). Use either:
      </p>
      <ul>
        <li>
          <code>Authorization: Bearer &lt;HOPE_PUBLISH_API_KEY&gt;</code>
        </li>
        <li>
          <code>x-api-key: &lt;HOPE_PUBLISH_API_KEY&gt;</code>
        </li>
      </ul>

      <h2>Upload an image first</h2>
      <p>
        Same API key. Send a public <code>https</code> image URL, a <code>data:image/...;base64,...</code> URI,
        or a multipart field named <code>file</code> (max 8MB). Kind Joe uploads it to Cloudinary and returns
        both crops. Paste those two URLs into the publish body. You do not need your own Cloudinary keys.
      </p>
      <pre>
        <code>{`curl -X POST "$KINDJOE_API_BASE_URL/api/partner/upload-image" \\
  -H "Authorization: Bearer $HOPE_PUBLISH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "imageUrl": "https://example.com/storm-photo.jpg" }'`}</code>
      </pre>
      <pre>
        <code>{`{
  "success": true,
  "originalUrl": "https://res.cloudinary.com/…/kindjoe/articles/storm.jpg",
  "coverImageUrl": "https://res.cloudinary.com/…/c_fill,g_auto,w_1600,h_900,…",
  "postCard": { "imageUrl": "https://res.cloudinary.com/…/c_fill,g_auto,w_800,h_800,…" }
}`}</code>
      </pre>

      <h2>Request body</h2>
      <pre>
        <code>{`{
  "slug": "my-article-slug",
  "title": "Article title",
  "excerpt": "At least twelve words in the excerpt for validation.",
  "contentMarkdown": "# Full markdown body…",
  "coverImageUrl": "https://…",
  "category": "Local News",
  "tags": ["ventura-county"],
  "seo": {
    "title": "SEO title",
    "description": "Meta description — at least 70 characters required.",
    "sourceUrl": "https://original-source",
    "sourceArticleId": 12345,
    "sourceType": "news_rss_articles"
  },
  "postCard": {
    "imageUrl": "https://res.cloudinary.com/…/tile.jpg",
    "caption": "Optional"
  },
  "isVentura": true
}`}</code>
      </pre>

      <h2>Upsert behavior</h2>
      <ul>
        <li>
          <strong>New slug</strong> → create live article + post card, return <code>201</code>,{" "}
          <code>created: true</code>
        </li>
        <li>
          <strong>Existing slug</strong> → update that article in place (any origin: partner, CMS,
          Daily Brief), return <code>200</code>, <code>created: false</code>
        </li>
        <li>
          On update, only sent fields change. Changing <code>title</code> does{" "}
          <strong>not</strong> change the slug/URL.
        </li>
        <li>
          <code>publishedAt</code> stays as originally published. <code>updatedAt</code> is bumped
          so the transparency panel can show “Last updated”.
        </li>
      </ul>

      <h2>Response (201 create / 200 update)</h2>
      <pre>
        <code>{`{
  "success": true,
  "created": true,
  "articleId": "…",
  "slug": "my-article-slug",
  "articleUrl": "https://www.kindjoe.com/my-article-slug",
  "destinationUrl": "https://www.kindjoe.com/my-article-slug",
  "postId": 42,
  "feed": "ventura",
  "authorId": "cms-writer-id"
}`}</code>
      </pre>

      <h2>What Kind Joe does</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Publish / upsert</td>
            <td>
              Create: live article (<code>isDraft: false</code>, <code>publishedAt</code> = now).
              Update: keep <code>publishedAt</code>, bump <code>updatedAt</code>, never rename slug.
            </td>
          </tr>
          <tr>
            <td>Author</td>
            <td>Random CMS Writer or Editor (not system-ai / rss-auto-writer)</td>
          </tr>
          <tr>
            <td>Ventura</td>
            <td>
              tag <code>ventura-county</code>, post card in <code>ventura_posts</code>. Public URL stays{" "}
              <code>/{"{slug}"}</code>
            </td>
          </tr>
          <tr>
            <td>KindJoe</td>
            <td>
              <code>/{"{slug}"}</code>, row in <code>posts</code>
            </td>
          </tr>
          <tr>
            <td>Post card</td>
            <td>
              <code>destinationUrl</code> = article URL (same as admin post modal)
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Hope env (your app)</h2>
      <p>
        Image upload uses Kind Joe&apos;s Cloudinary. Hope only needs the shared publish key.
      </p>
      <pre>
        <code>{`KINDJOE_API_BASE_URL=https://www.kindjoe.com
HOPE_PUBLISH_API_KEY=<same secret as Kind Joe>`}</code>
      </pre>

      <h2>Edit via the same publish endpoint</h2>
      <p>
        Muse should keep calling <code>POST /api/partner/publish</code> with the existing slug.
        Prefer that over a separate edit route. Send the fields to change (full payload is fine).
      </p>
      <pre>
        <code>{`curl -X POST "$KINDJOE_API_BASE_URL/api/partner/publish" \\
  -H "Authorization: Bearer $HOPE_PUBLISH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "slug": "existing-daily-brief-slug",
    "title": "Corrected headline",
    "excerpt": "Twelve word minimum excerpt still applies when you send excerpt.",
    "contentMarkdown": "# Revised body…",
    "coverImageUrl": "https://res.cloudinary.com/…/cover.jpg",
    "category": "Local News",
    "tags": ["oxnard-news"],
    "seo": {
      "title": "SEO title",
      "description": "Seventy character minimum meta description still applies when you send it."
    },
    "postCard": { "imageUrl": "https://res.cloudinary.com/…/tile.jpg" },
    "isVentura": false
  }'`}</code>
      </pre>
      <p>
        Expect <code>200</code> and <code>created: false</code>. The public URL stays{" "}
        <code>/existing-daily-brief-slug</code> even if the title changed.
      </p>

      <h2>Quick test</h2>
      <pre>
        <code>{`curl -X POST "$KINDJOE_API_BASE_URL/api/partner/publish" \\
  -H "Authorization: Bearer $HOPE_PUBLISH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"hope-test-…","title":"Test","excerpt":"Twelve word minimum excerpt for validation.","contentMarkdown":"# Test","seo":{"description":"Seventy character minimum meta description for publish validation on Kind Joe."},"postCard":{"imageUrl":"https://res.cloudinary.com/demo/image/upload/sample.jpg"}}'`}</code>
      </pre>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/developers/kindjoe-posts">KindJoe post cards</Link> — feed tile model
        </li>
        <li>
          Read-only RSS pool: see markdown doc{" "}
          <code>docs/developers/rss-news-read-api.md</code> in the repo
        </li>
      </ul>

      <h2>Errors</h2>
      <ul>
        <li>
          <code>401</code> — invalid/missing API key
        </li>
        <li>
          <code>400</code> — validation (excerpt, SEO, body)
        </li>
        <li>
          No more <code>409</code> on existing slug — that path updates instead
        </li>
      </ul>
    </article>
  );
}
