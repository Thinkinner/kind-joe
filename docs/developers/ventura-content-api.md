# Ventura Content API

This API lets partner websites display Ventura stories from KindJoe.

The integration is read-only. Partners can fetch content and render it on their own site, but they cannot create, edit, or delete posts through this API.

## Host and base path

- Production host: `https://kindjoe.com`
- API base path: `/api/articles`

If you publish docs on `developers.kindjoe.com`, keep this page as your canonical API reference.

## Access model

- Public read access
- No authentication required for read endpoints
- No write methods exposed for partners

## Endpoint: list Ventura stories

`GET /api/articles/ventura-county`

Returns published stories tagged for Ventura County.

### Example request

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
- `authorName`: author display name
- `authorAvatarUrl`: author avatar image URL

### Content selection rules

Only articles that meet all of the following are returned:

- Not draft (`isDraft = false`)
- Not deleted (`deletedAt = null`)
- Published now or in the past
- Tagged with `ventura-county`

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

1. Fetch stories from `GET /api/articles/ventura-county`.
2. Cache responses for better performance and fewer requests.
3. Render the list using `title`, `excerpt`, `slug`, and `coverImageUrl`.
4. Link back to the KindJoe source URL using `https://kindjoe.com/ventura/{slug}` (or your canonical story route).
5. Treat this API as read-only; do not attempt `POST`, `PUT`, `PATCH`, or `DELETE`.

## Versioning guidance

Current routes are unversioned. If you need stronger compatibility guarantees for external partners, introduce:

- `GET /api/v1/articles/ventura-county`
- `GET /api/v1/articles/:slug/related`

and keep `v1` stable as integrations grow.
