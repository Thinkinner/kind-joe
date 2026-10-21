export default function PartnerPostsApiDocsPage() {
  return (
    <article className="prose prose-slate prose-headings:scroll-mt-24 max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_-30px_rgb(15_23_42/0.45)] sm:p-8">
      <h1>Partner Posts API</h1>
      <p>
        Upload a link-in-bio post tile to any Kind Joe desk. No staff login. Same key as the
        partner publish API.
      </p>

      <h2>Endpoint</h2>
      <p>
        <code>POST /api/partner/posts</code>
      </p>

      <h2>Authentication</h2>
      <p>
        Send <code>Authorization: Bearer &lt;HOPE_PUBLISH_API_KEY&gt;</code> or{" "}
        <code>x-api-key: &lt;HOPE_PUBLISH_API_KEY&gt;</code>.
      </p>

      <h2>Desks</h2>
      <ul>
        <li>
          <code>kindjoe</code> — <code>/posts</code>
        </li>
        <li>
          <code>ventura</code> — <code>/ventura/posts</code>
        </li>
        <li>
          <code>la</code> — <code>/joeknowsla/posts</code>
        </li>
        <li>
          <code>oxnard</code> — <code>/oxnard/posts</code>
        </li>
        <li>
          <code>slo</code> — <code>/joefromslo/posts</code>
        </li>
      </ul>
      <p>
        Aliases also work: <code>joeknowsla</code>, <code>oxnard-news</code>,{" "}
        <code>cityofox</code>, <code>joefromslo</code>, <code>ventura-county</code>.
      </p>

      <h2>Cloudinary</h2>
      <p>
        Kind Joe uploads the photo to Cloudinary in the <code>kindjoe/posts</code> folder and
        saves that link on the post. The caller does not need Cloudinary keys.
      </p>
      <ul>
        <li>Send the file as multipart field <code>file</code>.</li>
        <li>
          Or send <code>imageBase64</code> as a <code>data:image/…;base64,…</code> string.
        </li>
        <li>
          Or send <code>imageUrl</code>. A link that is not already on Kind Joe Cloudinary is
          copied there first.
        </li>
      </ul>

      <h2>File upload</h2>
      <pre>
        <code>{`curl -X POST https://www.kindjoe.com/api/partner/posts \\
  -H "Authorization: Bearer $HOPE_PUBLISH_API_KEY" \\
  -F "desk=ventura" \\
  -F "destinationUrl=https://www.kindjoe.com/your-story" \\
  -F "caption=Optional" \\
  -F "file=@tile.jpg"`}</code>
      </pre>

      <h2>JSON body</h2>
      <pre>
        <code>{`{
  "desk": "ventura",
  "imageUrl": "https://res.cloudinary.com/…/tile.jpg",
  "destinationUrl": "https://www.kindjoe.com/your-story",
  "caption": "Optional"
}`}</code>
      </pre>
      <p>
        <code>imageUrl</code> in the response is the Cloudinary URL stored on the post.
      </p>

      <h2>Response (201)</h2>
      <pre>
        <code>{`{
  "success": true,
  "desk": "ventura",
  "id": 42,
  "feedPath": "/ventura/posts",
  "imageUrl": "https://…",
  "destinationUrl": "https://…"
}`}</code>
      </pre>
    </article>
  );
}
