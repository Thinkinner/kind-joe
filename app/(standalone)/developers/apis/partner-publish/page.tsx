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
          Implemented at <code>POST /api/partner/publish</code>. Deploy with{" "}
          <code>HOPE_PUBLISH_API_KEY</code> set in production.
        </p>
      </div>

      <h2>Endpoint</h2>
      <pre>
        <code>POST /api/partner/publish</code>
      </pre>

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

      <h2>Response (201)</h2>
      <pre>
        <code>{`{
  "success": true,
  "articleId": "…",
  "slug": "my-article-slug",
  "articleUrl": "https://www.kindjoe.com/ventura/my-article-slug",
  "destinationUrl": "https://www.kindjoe.com/ventura/my-article-slug",
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
            <td>Publish</td>
            <td>Live article (<code>isDraft: false</code>, <code>publishedAt</code> = now)</td>
          </tr>
          <tr>
            <td>Author</td>
            <td>Random CMS Writer or Editor (not system-ai / rss-auto-writer)</td>
          </tr>
          <tr>
            <td>Ventura</td>
            <td>
              <code>/ventura/{"{slug}"}</code>, tag <code>ventura-county</code>, row in{" "}
              <code>ventura_posts</code>
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
      <pre>
        <code>{`KINDJOE_API_BASE_URL=https://www.kindjoe.com
HOPE_PUBLISH_API_KEY=<same secret as Kind Joe>
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…`}</code>
      </pre>

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
          <code>409</code> — slug conflict
        </li>
      </ul>
    </article>
  );
}
