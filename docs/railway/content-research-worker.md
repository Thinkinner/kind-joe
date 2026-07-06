# Content Research Worker (Railway)



Run the source-first article worker as a **separate Railway service** so Content Research never hits Vercel/serverless timeouts.



## How it works (no timeout on Vercel)



1. Admin clicks **Start content research** on Vercel → fast API call inserts a row in `source_first_article_jobs` (~100ms).

2. Admin UI **polls job status** every 4 seconds (also fast, no heavy AI on Vercel).

3. **Railway worker** (always-on) claims the job, runs research + draft (1–3+ minutes).

4. UI opens the editor when status is `done`.



Vercel never runs the long AI work — only queue + poll.



## Create the Railway worker service



### 1. New project + service



1. Go to [Railway](https://railway.app) → **New Project**.

2. **Deploy from GitHub repo** → select `kind-joe`.

3. Name the service `kind-joe-content-research-worker`.

4. Keep your **main site on Vercel** — this Railway service is worker-only.



### 2. Service settings



| Setting | Value |

|--------|--------|

| **Root directory** | `/` (repo root) |

| **Build command** | `echo skip worker build` (or leave default; repo `railway.json` sets this) |

| **Start command** | `npm run worker:source-first-article` |

| **Replicas** | `1` (always-on) |



The repo `railway.json` defaults to the worker start command when Railway reads it for this service.



### 3. Required environment variables



Copy from production Vercel (same database and AI keys):



| Variable | Purpose |

|----------|---------|

| `DATABASE_URL` | **Same Postgres as production** (required) |

| `GOOGLE_API_KEY` | Gemini article + metadata generation |

| `GOOGLE_SEARCH_ENGINE_ID` | Custom Search engine ID (`cx`) — or `GOOGLE_CSE_ID` |

| `GOOGLE_SEARCH_API_KEY` | Optional; falls back to `GOOGLE_API_KEY` |



Recommended for faster pickup + health checks:



| Variable | Value | Purpose |

|----------|-------|---------|

| `SOURCE_FIRST_ARTICLE_WORKER_INTERVAL_SECONDS` | `5` | Poll queue every 5s when idle (default in code) |

| `UPSTASH_REDIS_REST_URL` | same as Vercel | Worker heartbeat (admin UI shows if worker is online) |

| `UPSTASH_REDIS_REST_TOKEN` | same as Vercel | Worker heartbeat |



Optional model overrides:



| Variable | Default |

|----------|---------|

| `SOURCE_FIRST_RESEARCH_MODEL` | `gemini-2.5-flash` |

| `SOURCE_FIRST_ARTICLE_MODEL` | `gemini-3.5-flash` |

| `GEMINI_ARTICLE_ASSIST_MODEL` | `gemini-3.5-flash` |



### 4. Deploy checklist



- [ ] Service start command is `npm run worker:source-first-article` (not `next start`)

- [ ] `DATABASE_URL` matches production Neon/Vercel

- [ ] Google keys + `GOOGLE_SEARCH_ENGINE_ID` set

- [ ] Custom Search API enabled in Google Cloud

- [ ] Migrations applied: `npm run db:migrate` (table `source_first_article_jobs`)

- [ ] Logs show: `[source-first-worker] boot interval=5s runOnce=false`



### 5. Verify



1. Railway logs → worker boot message appears and repeats every ~5s when idle.

2. Admin → **Content research** → paste a URL → **Start content research**.

3. Status should move `queued` → `processing` within ~5–10 seconds.

4. Railway logs → `processed jobId=...`

5. Admin UI opens editor when `done`.



## Local development



Terminal 1 — site:



```bash

npm run dev

```



Terminal 2 — worker:



```bash

npm run worker:source-first-article

```



## Troubleshooting



| Symptom | Fix |

|---------|-----|

| Job stays `queued` forever | Worker not running, or wrong `DATABASE_URL` |

| Admin shows “Railway worker not detected” | Deploy worker service; copy Redis env vars for heartbeat |

| Job `failed` | Check Railway logs and job `error` field |

| Slow pickup | Set `SOURCE_FIRST_ARTICLE_WORKER_INTERVAL_SECONDS=5` |

| Insert error on queue | Run `npm run db:migrate` on production DB |



## Related files



- `railway.json` — worker deploy defaults

- `scripts/workers/source-first-article-worker.ts`

- `lib/agents/source-first-article-jobs.ts`

- `lib/agents/source-first-worker-status.ts`

- `app/api/admin/ai/source-first/worker-status/route.ts`

- `components/admin/cms/content-research-writer.tsx`

