# Folder Move Matrix (Compatibility-First)

This matrix documents the internal reorganization to domain folders while preserving existing routes and runtime behavior.

## Principles

- Keep external URLs and API paths unchanged.
- Keep old import paths working via compatibility wrappers.
- Move entrypoints first, then migrate callers incrementally.

## `lib/` migration map

| Old path | New path | Status |
| --- | --- | --- |
| `lib/aggregator/*` | `lib/domains/signals/ingest/*` | Added compat wrappers |
| `lib/signals/*` | `lib/domains/signals/domain/*` | Added compat wrappers |
| `lib/actions/news-signal.ts` | `lib/domains/signals/actions/news-signal.ts` | Moved entrypoint (wrapper removed) |
| `lib/predictions/*` | `lib/domains/predictions/*` | Added domain re-export index |
| `lib/webhooks/*` | `lib/domains/webhooks/*` | Added domain re-export index |
| `lib/email/resend.ts` | `lib/integrations/email/resend.ts` | Moved entrypoint + wrapper |
| `lib/ghl/*` | `lib/integrations/ghl/*` | Moved entrypoints + wrappers |

## `app/api/` migration map

| Existing route file | New internal handler | URL change |
| --- | --- | --- |
| `app/api/webhooks/x/route.ts` | `app/api/(core)/webhooks/x/handler.ts` | None |
| `app/api/admin/outgoing-webhooks/route.ts` | `app/api/(core)/admin/outgoing-webhooks/handler.ts` | None |
| `app/api/admin/outgoing-webhooks/[id]/route.ts` | `app/api/(core)/admin/outgoing-webhooks/[id]/handler.ts` | None |

## `components/` migration map

| Old path | New path | Status |
| --- | --- | --- |
| `components/kindjoe-signals/*` | `components/domains/signals/*` | Added compat wrappers |
| `components/admin/*` | `components/domains/admin/*` | Added compat wrappers |
| `components/predictions/*` | `components/domains/predictions/*` | Added domain re-export index |

## `scripts/` migration map

| Old path | New path | Status |
| --- | --- | --- |
| `scripts/discord-listener-worker.ts` | `scripts/workers/discord-listener-worker.ts` | Moved + script updated (legacy file removed) |

## Rollout order

1. Establish new folders + wrappers (safe).
2. Point runtime entrypoints to new locations.
3. Migrate imports gradually in feature areas.
4. Remove wrappers only after full lint/smoke pass.
