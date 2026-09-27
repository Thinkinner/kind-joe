# Ventura Content API

This API lets partner websites display Ventura stories from KindJoe.

The integration is read-only. Partners can fetch content and render it on their own site, but they cannot create, edit, or delete posts through this API.

## Host and base path

- Production host: `https://kindjoe.com`
- API base paths:
  - `/api/ventura` for Ventura posts feed cards
  - `/api/ventura` for Ventura article and posts feeds
  - `/api/articles` for Ventura article compatibility routes

If you publish docs on `developers.kindjoe.com`, keep this page as your canonical API reference.

## Access model

- Public read access
- No authentication required for read endpoints
- No write methods exposed for partners

## Endpoint: list Ventura posts feed cards

`GET /api/ventura/posts`

Returns the same Ventura post cards shown on `/ventura/posts`.

### Pagination (recommended)

Use query params for incremental loading:

- `limit` (1-100)
- `offset` (0+)

Example:

```bash
curl "https://kindjoe.com/api/ventura/posts?limit=20&offset=0"
```

Paginated response shape:

```json
{
  "items": [],
  "hasMore": true,
  "nextOffset": 20,
  "limit": 20,
  "offset": 0
}
```

### Example request

Unpaginated requests return up to **50** items. Use `limit` and `offset` for larger or incremental loads.

```bash
curl "https://kindjoe.com/api/ventura/posts"
```

### Example response

```json
[
  {
    "id": 101,
    "imageUrl": "https://cdn.example.com/ventura-post-1.jpg",
    "destinationUrl": "https://kindjoe.com/ventura/some-story",
    "caption": "Optional caption text",
    "isPinned": true,
    "order": 0,
    "isActive": true,
    "createdAt": "2026-04-20T14:55:00.000Z"
  }
]
```

### Response fields

- `id`: stable Ventura post identifier
- `imageUrl`: card image URL
- `destinationUrl`: URL opened when card is clicked
- `caption`: optional caption text
- `isPinned`: pin flag used for feed ordering
- `order`: manual ordering value
- `isActive`: whether the post is active
- `createdAt`: creation timestamp

### Content selection and ordering

Only posts with `isActive = true` (or `null`) are returned, ordered by:

1. `isPinned` descending
2. `order` ascending
3. `id` descending

## Endpoint: list Ventura stories

`GET /api/ventura/articles`

Primary endpoint for Ventura article list integrations.

### Pagination (recommended)

Use query params for incremental loading:

- `limit` (1-100)
- `offset` (0+)

Example:

```bash
curl "https://kindjoe.com/api/ventura/articles?limit=20&offset=0"
```

Paginated response shape:

```json
{
  "items": [],
  "hasMore": true,
  "nextOffset": 20,
  "limit": 20,
  "offset": 0
}
```

### Example request

Unpaginated requests return up to **50** items. Use `limit` and `offset` for larger or incremental loads.

```bash
curl "https://kindjoe.com/api/ventura/articles"
```

### Backward-compatible alias

`GET /api/articles/ventura-county`

Returns the same published Ventura-tagged article list.
Supports the same optional `limit` and `offset` query params.

### Example request

Unpaginated requests return up to **50** items. Use `limit` and `offset` for larger or incremental loads.

```bash
curl "https://kindjoe.com/api/articles/ventura-county"
```

### Example response

```json
[
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
    "authorName": "KindJoe Editorial",
    "authorAvatarUrl": "https://cdn.example.com/avatar.png"
  }
]
```

### Response fields

- `id`: stable article identifier
- `slug`: path-safe article key
- `title`: article title
- `excerpt`: short summary
- `category`: article category
- `coverImageUrl`: thumbnail/cover image URL
- `publishedAt`: publish timestamp
- `publishAt`: fallback scheduled timestamp
- `createdAt`: creation timestamp
- `readingMinutes`: estimated read time
- `authorAlias`: current author alias from staff profile (`users.aliasFullName`)
- `authorName`: current author name from staff profile (`users.name`)
- `authorAvatarUrl`: author avatar image URL

## Endpoint: Ventura article detail by slug

`GET /api/ventura/articles/:slug`

Returns a full Ventura article payload for rendering editorial pages.

### Example request

```bash
curl "https://kindjoe.com/api/ventura/articles/ventura-housing-update"
```

### Example response

```json
{
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
}
```

### Content selection rules

Only articles that meet all of the following are returned:

- Not draft (`isDraft = false`)
- Not deleted (`deletedAt = null`)
- Published now or in the past
- Matches the same Ventura selection as [kindjoe.com/ventura-county](https://www.kindjoe.com/ventura-county):
  - tags `ventura-county` or `venturacountynews`, **or**
  - category / tag text containing `ventura`
  - Does **not** include L.A. (`la-news`) or SLO desk feeds

### Sort order

- Descending by `publishedAt` (newest first)

## Optional endpoint: related stories by slug

`GET /api/articles/:slug/related`

Returns related published stories for a specific article slug.

### Example request

```bash
curl "https://kindjoe.com/api/articles/ventura-housing-update/related"
```

### Example response

```json
{
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
}
```

## Error behavior

For `GET /api/articles/:slug/related`:

- `404` when the source article slug does not exist or is not published
- `500` when related lookup fails unexpectedly

## Partner implementation checklist

1. Fetch Ventura feed cards from `GET /api/ventura/posts` for `/ventura/posts` style integrations.
2. Fetch article lists from `GET /api/articles/ventura-county` when article metadata is needed.
   - Preferred: `GET /api/ventura/articles`
   - Compatible alias: `GET /api/articles/ventura-county`
3. Fetch full editorial content from `GET /api/ventura/articles/:slug` for article detail pages.
4. Cache responses for better performance and fewer requests.
5. Treat this API as read-only; do not attempt `POST`, `PUT`, `PATCH`, or `DELETE`.

## Versioning guidance

Current routes are unversioned. If you need stronger compatibility guarantees for external partners, introduce:

- `GET /api/v1/articles/ventura-county`
- `GET /api/v1/ventura/articles`
- `GET /api/v1/ventura/articles/:slug`
- `GET /api/v1/articles/:slug/related`
- `GET /api/v1/ventura/posts`

and keep `v1` stable as integrations grow.
