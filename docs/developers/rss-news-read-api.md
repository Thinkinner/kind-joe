# RSS News Read API

Use this API when another app needs read-only access to `news_rss_articles`.

## Endpoint

- `GET /api/rss-news/articles`

## Auth

In production, requests must include `RSS_NEWS_READ_API_KEY`.

Use either header:

- `Authorization: Bearer <RSS_NEWS_READ_API_KEY>`
- `x-api-key: <RSS_NEWS_READ_API_KEY>`

If missing/invalid, API returns `401 Unauthorized`.

## Query Parameters

### Pagination

- `limit` - number of rows (default `50`)
  - max is controlled by `RSS_NEWS_READ_MAX_LIMIT` (default `200`)
  - hard cap `500`
- `cursor` - id cursor pagination (best with default `sortBy=id&sortOrder=desc`)
- `offset` - offset pagination (default `0`, max `5000`)

### Filters

- `ids` - comma-separated article ids (example: `ids=12,13,14`)
- `sourceId` - single source id
- `sourceIds` - comma-separated source ids
- `aiProcessed` - `true` or `false`
- `hasImage` - `true` or `false`
- `q` - text search on `title`, `modifiedTitle`, `contentSnippet`
- `createdFrom` - ISO datetime
- `createdTo` - ISO datetime
- `publishedFrom` - ISO datetime
- `publishedTo` - ISO datetime

### Sorting

- `sortBy` - `id | createdAt | publishedAt` (default `id`)
- `sortOrder` - `asc | desc` (default `desc`)

### Field Selection

- `fields` - comma-separated projection list
- allowed fields:
  - `id`
  - `sourceId`
  - `sourceName`
  - `sourceUrl`
  - `title`
  - `modifiedTitle`
  - `link`
  - `imageUrl`
  - `contentSnippet`
  - `publishedAt`
  - `createdAt`
  - `aiProcessed`

If `fields` is omitted, metadata fields are returned (`contentSnippet` is excluded). Add `fields=contentSnippet` (or include it in a comma-separated list) when you need snippet text.

## Response Shape

```json
{
  "success": true,
  "count": 50,
  "limit": 50,
  "maxLimit": 200,
  "offset": 0,
  "sortBy": "id",
  "sortOrder": "desc",
  "nextCursor": 12345,
  "hasMore": true,
  "items": [
    {
      "id": 12346,
      "sourceId": 3,
      "sourceName": "Example Source",
      "sourceUrl": "https://example.com/rss",
      "title": "Sample title",
      "modifiedTitle": null,
      "link": "https://example.com/article",
      "imageUrl": "https://example.com/image.jpg",
      "publishedAt": "2026-05-21T08:00:00.000Z",
      "createdAt": "2026-05-21T08:01:10.000Z",
      "aiProcessed": false
    }
  ]
}
```

## Examples

### 1) Basic Fetch

```bash
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=50" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"
```

### 2) Search + Image Only + Sort by Published Date

```bash
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=100&q=ventura&hasImage=true&sortBy=publishedAt&sortOrder=desc" \
  -H "x-api-key: YOUR_RSS_NEWS_READ_API_KEY"
```

### 3) Include Snippets When Needed

```bash
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=100&fields=id,title,link,publishedAt,sourceName,contentSnippet" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"
```

### 4) Select Only Needed Fields

```bash
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=100&fields=id,title,link,publishedAt,sourceName" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"
```

### 5) Cursor Pagination

```bash
# first page
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=100" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"

# next page (use nextCursor from previous response)
curl "https://YOUR_DOMAIN/api/rss-news/articles?limit=100&cursor=12345" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"
```

### 6) Fetch by Multiple IDs/Sources

```bash
curl "https://YOUR_DOMAIN/api/rss-news/articles?ids=101,102,103&sourceIds=1,2" \
  -H "Authorization: Bearer YOUR_RSS_NEWS_READ_API_KEY"
```

## Recommended Env Vars

- `RSS_NEWS_READ_API_KEY` (required in production)
- `RSS_NEWS_READ_MAX_LIMIT` (optional, default `200`)

## Notes

- This endpoint is read-only.
- No insert/update/delete behavior is exposed.
- For large sync jobs, prefer cursor pagination with `id desc`.
