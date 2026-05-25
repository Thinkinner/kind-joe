# Partner Publish API (Hope → Kind Joe)

Server-to-server publish endpoint for partner apps (e.g. **Hope**) to create a **live article** and matching **post card** in one request.

Hope does **not** need Kind Joe staff cookies or admin login — only a shared API key.

## Endpoint

- `POST /api/partner/publish`

## Auth

Set the same secret on **both** apps:

```bash
HOPE_PUBLISH_API_KEY=<long random secret>
```

Send either header:

- `Authorization: Bearer <HOPE_PUBLISH_API_KEY>`
- `x-api-key: <HOPE_PUBLISH_API_KEY>`

In **production**, requests without a valid key return `401 Unauthorized`.

In **local dev**, if `HOPE_PUBLISH_API_KEY` is unset, the route accepts requests (dev only).

## Request body (JSON)

```json
{
  "slug": "my-article-slug",
  "title": "Article title",
  "excerpt": "Subtitle / deck — at least 12 words for publish validation",
  "contentMarkdown": "# Full article markdown…",
  "coverImageUrl": "https://…",
  "category": "Local News",
  "tags": ["ventura-county"],
  "seo": {
    "title": "SEO title",
    "description": "Meta description — at least 70 characters",
    "sourceUrl": "https://original-rss-url",
    "sourceArticleId": 12345,
    "sourceType": "news_rss_articles"
  },
  "postCard": {
    "imageUrl": "https://res.cloudinary.com/…/square-tile.jpg",
    "caption": "Optional caption"
  },
  "isVentura": true
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `slug` | Yes | Unique; normalized to URL slug |
| `title` | Yes | |
| `excerpt` | Yes | ≥ 12 words |
| `contentMarkdown` | Yes | Full article body |
| `coverImageUrl` | No | Hero image |
| `category` | No | Defaults to `General` |
| `tags` | No | Ventura adds `ventura-county` when needed |
| `seo.description` | Yes | ≥ 70 characters |
| `postCard.imageUrl` | Yes | Square tile (Cloudinary URL from Hope) |
| `postCard.caption` | No | |
| `isVentura` | No | `true` → Ventura URLs + `ventura_posts` feed |

## Response (`201`)

```json
{
  "success": true,
  "articleId": "abc123…",
  "slug": "my-article-slug",
  "articleUrl": "https://www.kindjoe.com/ventura/my-article-slug",
  "destinationUrl": "https://www.kindjoe.com/ventura/my-article-slug",
  "postId": 42,
  "feed": "ventura",
  "authorId": "cms-user-id"
}
```

| Field | Meaning |
|-------|---------|
| `feed` | `"ventura"` or `"kindjoe"` |
| `articleUrl` | Public story URL |
| `destinationUrl` | Post card link (same as article URL) |
| `postId` | Row id in `ventura_posts` or `posts` |

## Behavior (Kind Joe)

| Requirement | Implementation |
|-------------|----------------|
| Live publish | `isDraft: false`, `publishedAt` = now |
| Author | Random CMS `users` row with role **Writer** or **Editor** (excludes `system-ai`, `rss-auto-writer`) |
| Validation | Excerpt ≥ 12 words, `seo.description` ≥ 70 chars, unique slug |
| Ventura | `isVentura: true` or Ventura category/tags → tag `ventura-county`, URL `/ventura/{slug}`, row in `ventura_posts` |
| Non-Ventura | URL `/{slug}`, row in `posts` |
| Post card | `destinationUrl` matches article URL (same as CMS post modal) |

## Errors

| Status | Meaning |
|--------|---------|
| `401` | Missing/invalid API key |
| `400` | Validation failed (body, excerpt, SEO, etc.) |
| `409` | Slug already exists |

## Hope environment variables

```bash
KINDJOE_API_BASE_URL=https://www.kindjoe.com
HOPE_PUBLISH_API_KEY=<same secret as Kind Joe>
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```

`HOPE_PUBLISH_API_KEY` must match **exactly** on both apps.

## RSS read (separate)

Hope can **read** ingest pool via existing API (not publish):

- `GET /api/rss-news/articles`
- Auth: `RSS_NEWS_READ_API_KEY`

See [RSS News Read API](./rss-news-read-api.md).

## Connectivity test

```bash
curl -X POST "https://www.kindjoe.com/api/partner/publish" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "hope-test-'$(date +%s)'",
    "title": "Hope connectivity test",
    "excerpt": "Twelve word minimum excerpt for validation rules on Kind Joe publish.",
    "contentMarkdown": "# Test\n\nBody content for connectivity check.",
    "seo": {
      "description": "Seventy character minimum meta description for publish validation on Kind Joe CMS."
    },
    "postCard": {
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/sample.jpg"
    }
  }'
```

Expect `201` with `success: true`.

## Implementation files

- `app/api/partner/publish/route.ts`
- `lib/partner/publish-bundle.ts`
- `lib/partner/save-taxonomy.ts`
