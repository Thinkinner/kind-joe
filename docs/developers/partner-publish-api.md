# Partner Publish API (Hope → Kind Joe)

Server-to-server publish endpoint for partner apps (e.g. **Hope**) to create a **live article** and matching **post card** in one request.

Hope does **not** need Kind Joe staff cookies or admin login — only a shared API key.

## Endpoints

- `POST /api/partner/upload-image` — put the photo on Kind Joe Cloudinary and get the hero + square links
- `POST /api/partner/publish` — create the live article

Upload first, then paste `coverImageUrl` and `postCard.imageUrl` into the publish body. The other app does not need its own Cloudinary keys.

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
  "articleUrl": "https://www.kindjoe.com/my-article-slug",
  "destinationUrl": "https://www.kindjoe.com/my-article-slug",
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
| Ventura | `isVentura: true` or Ventura category/tags → tag `ventura-county`, post card in `ventura_posts`. Public URL is still `/{slug}` |
| Non-Ventura | URL `/{slug}`, row in `posts` |
| Post card | `destinationUrl` matches article URL (same as CMS post modal) |

## Errors

| Status | Meaning |
|--------|---------|
| `401` | Missing/invalid API key |
| `400` | Validation failed (body, excerpt, SEO, etc.) |
| `409` | Slug already exists |

## Upload an image

`POST /api/partner/upload-image`

Same API key as publish. Send one of:

1. JSON with a public image link (the usual case for a generated photo):

```bash
curl -X POST "https://www.kindjoe.com/api/partner/upload-image" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "imageUrl": "https://example.com/storm-photo.jpg" }'
```

2. JSON with a data URI: `{ "imageBase64": "data:image/jpeg;base64,..." }`
3. Multipart form field `file` (jpeg, png, webp, or gif, max 8MB)

Kind Joe stores the file in Cloudinary folder `kindjoe/articles` and returns both crops from that one upload:

```json
{
  "success": true,
  "originalUrl": "https://res.cloudinary.com/…/kindjoe/articles/storm.jpg",
  "coverImageUrl": "https://res.cloudinary.com/…/c_fill,g_auto,w_1600,h_900,f_auto,q_auto/…",
  "postCard": {
    "imageUrl": "https://res.cloudinary.com/…/c_fill,g_auto,w_800,h_800,f_auto,q_auto/…"
  }
}
```

Use `coverImageUrl` as the article hero and `postCard.imageUrl` as the square tile. If `imageUrl` is already on this Cloudinary account, the route skips a second upload and only builds the two crops.

| Status | Meaning |
|--------|---------|
| `401` | Missing/invalid API key |
| `400` | No image, or `imageUrl` is not https |
| `413` | Over 8MB |
| `415` | Not an image |
| `429` | Too many uploads |
| `503` | Cloudinary is not configured on Kind Joe |

## Hope environment variables

```bash
KINDJOE_API_BASE_URL=https://www.kindjoe.com
HOPE_PUBLISH_API_KEY=<same secret as Kind Joe>
```

`HOPE_PUBLISH_API_KEY` must match **exactly** on both apps. Image upload uses Kind Joe's Cloudinary, so Hope does not need its own Cloudinary keys.

Kind Joe still needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the server that hosts this API.

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
- `app/api/partner/upload-image/route.ts`
- `lib/partner/auth.ts`
- `lib/partner/publish-bundle.ts`
- `lib/partner/save-taxonomy.ts`
