# Kind Joe Editorial Pipeline (AdSense Readiness)

This workflow is the standard for publishing original editorial pieces and meeting AdSense quality requirements.

## Output Target

- Publish at least 10 original articles in a 14-day cycle.
- Minimum article body length: 600 words for publish/schedule.
- Minimum original "Kind Joe take" in body: 300 words for publish/schedule.

## 14-Day Cadence

- Days 1-3: Build queue and assign topics.
- Days 4-10: Publish one original editorial article per day.
- Days 11-14: Publish remaining pieces and update internal links.

## Required Mix for Each 10-Article Sprint

- 3 opinion pieces.
- 3 explainers/deep dives.
- 2 local Ventura or community impact pieces.
- 2 business or tech analysis pieces.

## Article Structure (Required)

1. Headline with clear claim or question.
2. Context paragraph: what happened and why now.
3. Kind Joe take section with original analysis (minimum 300 words).
4. Evidence section with cited source context.
5. Reader impact section (what this means next).
6. Conclusion with unresolved questions or scenarios.

## Publish Gate Checklist

Before pressing Publish now or Schedule:

- Meta description is unique and at least 70 characters.
- Summary excerpt is at least 12 words.
- Body includes at least 300 words of original analysis.
- Full body reaches at least 600 words.
- Category and tags are set accurately.
- Legal-safe language: no unsupported claims, no fabricated quotes.

## Aggregated Story Upgrade Rules

When an article starts from outside reporting:

- Do not publish as a rewrite-only draft.
- Add original framing: local impact, scenario analysis, or stakeholder implications.
- Include at least one "what this means" section in your own voice.

## Verification Commands

- Local lint and route integrity:
  - `npm run verify:adsense-readiness`
- Public link check only:
  - `npm run check:public-links`

`check:public-links` validates core nav/footer/legal/support routes for HTTP success and non-placeholder content.

## Partner Publish API (Hope → Kind Joe)

Use this when **Hope** (or another partner) publishes approved stories to Kind Joe.

- Endpoint: `POST /api/partner/publish`
- Auth: `HOPE_PUBLISH_API_KEY` (Bearer or `x-api-key`, same value on both apps)
- Creates: live CMS article + post card (`posts` or `ventura_posts`)
- Full spec: [partner-publish-api.md](./partner-publish-api.md) and `/developers/apis/partner-publish`

Required on Kind Joe (production):

- `HOPE_PUBLISH_API_KEY`

## RSS News Read API (Cross-App Access)

Use this read-only API when another app needs `news_rss_articles` data.

- Endpoint: `GET /api/rss-news/articles`
- Auth:
  - `Authorization: Bearer <RSS_NEWS_READ_API_KEY>`
  - or `x-api-key: <RSS_NEWS_READ_API_KEY>`
- Query params:
  - `limit` (default `50`, max from `RSS_NEWS_READ_MAX_LIMIT`, capped at `500`)
  - `offset` (default `0`, max `5000`)
  - `cursor` (id-cursor pagination; best with default sort `id desc`)
  - `ids` (comma-separated article ids)
  - `sourceId` or `sourceIds` (comma-separated source ids)
  - `aiProcessed=true|false`
  - `hasImage=true|false`
  - `q` (title/modifiedTitle/contentSnippet search)
  - `createdFrom`, `createdTo` (ISO datetime)
  - `publishedFrom`, `publishedTo` (ISO datetime)
  - `sortBy=id|createdAt|publishedAt`
  - `sortOrder=asc|desc`
  - `fields` (comma-separated projection, e.g. `id,title,link,publishedAt`)

Response includes `items`, `nextCursor`, and `hasMore`.

Required env var in production:
- `RSS_NEWS_READ_API_KEY`

Optional:
- `RSS_NEWS_READ_MAX_LIMIT` (default `200`)

## Autonomous RSS Auto-Writer (Railway)

The app includes an autonomous RSS-to-draft writer job for `news_rss_articles`.

### What It Does Every Run

1. Pulls newest unprocessed `news_rss_articles` rows (`ai_processed = false`).
2. Probes source image quality and only accepts images at or above 1280x720.
3. Enqueues eligible items into durable queue table `rss_auto_writer_queue`.
4. Marks RSS rows as processed to avoid duplicate queueing.
5. Claims one queued item (`queued`/`failed`) and sets it to `processing`.
6. Writer uploads image to Cloudinary, generates markdown, and creates draft article.
7. Queue status is updated to `done`, `failed`, or `skipped` with metadata.

### Trigger Endpoint

- `POST /api/internal/rss-auto-writer`
- Auth header required:
  - `Authorization: Bearer <CRON_SECRET>`
- Optional query param:
  - `ingestLimit` (max RSS rows scanned for queueing this run)

### Required Environment Variables

- `CRON_SECRET` (required in production)
- `GOOGLE_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
  - or `CLOUDINARY_UPLOAD_PRESET` when using unsigned preset mode

Optional:
- `AUTO_WRITER_AUTHOR_ID` to force drafts under a specific CMS `users.id`

### Railway Schedule (Hourly)

Use Railway Cron in your service settings:

- Frequency: `0 * * * *`
- Method: `POST`
- URL: `https://<your-domain>/api/internal/rss-auto-writer`
- Header: `Authorization: Bearer <CRON_SECRET>`

### Alternative: Always-On Railway Workers (No Cron)

If you prefer not to rely on cron, run two dedicated worker services in Railway for smoother flow:

1) **Ingest worker** (scans RSS + fills queue)
- Start command: `npm run worker:rss-auto-writer-ingest`
- Recommended replicas: `1`
- Runs immediately on boot, then every `RSS_AUTO_WRITER_INGEST_INTERVAL_MINUTES` (default `60`)

2) **Queue worker** (drains queue continuously)
- Start command: `npm run worker:rss-auto-writer-queue`
- Recommended replicas: `1`
- Runs immediately on boot, then every `RSS_AUTO_WRITER_QUEUE_INTERVAL_SECONDS` (default `45`)
- Processes up to `RSS_AUTO_WRITER_WRITER_MAX_PER_RUN` queue items each cycle (default `5`)

Optional worker env vars:
- `RSS_AUTO_WRITER_INGEST_INTERVAL_MINUTES` (default `60`)
- `RSS_AUTO_WRITER_INGEST_LIMIT` (default `40`)
- `RSS_AUTO_WRITER_QUEUE_INTERVAL_SECONDS` (default `45`)
- `RSS_AUTO_WRITER_WRITER_MAX_PER_RUN` (default `5`)
- `RSS_AUTO_WRITER_RUN_ONCE=true` (manual one-shot testing)

### Monitoring and Recovery

- Response includes `ingestedScanned`, `queued`, `writerProcessed`, `skipped`, `failed`, `queueStats`, and per-item reasons.
- Queue lifecycle:
  - `queued` -> `processing` -> `done`
  - `queued`/`failed` -> `processing` -> `failed` (retryable)
  - duplicate checks result in `skipped`
- Queue worker can process multiple items per run via `RSS_AUTO_WRITER_WRITER_MAX_PER_RUN`.
- Failed queue items retry automatically up to attempt cap (`MAX_ATTEMPTS` in code).

### Rollback / Disable

- Fast disable: remove or pause Railway cron job.
- Hard disable: rotate/remove `CRON_SECRET` so cron calls return 401.
- Emergency stop for queue:
  - Mark queue rows to `skipped` or clear pending `queued`/`failed` rows in `rss_auto_writer_queue`.
- Emergency stop for new intake:
  - Temporarily set `ai_processed = true` on target `news_rss_articles` rows.
