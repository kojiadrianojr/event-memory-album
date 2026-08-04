# Upstash Redis Setup

Photo Album uses **Upstash Redis** (REST API) in production for rate limiting, API response caching, guest wall presence, and upload idempotency. The app talks to Upstash over HTTP in [`lib/upstash.ts`](../lib/upstash.ts) — no TCP Redis connection from Vercel serverless functions.

Local development continues to use Docker Redis (`REDIS_URL` / `make docker:up`). Upstash replaces that in production. When neither is set, rate limits fall back to in-memory and caching is skipped (DB-only).

---

## 1. Create an Upstash Redis database

1. Sign in at the [Upstash Console](https://console.upstash.com/redis).
2. **Create Database** (or **Create Redis Database**).
3. Recommended settings:
   - **Name**: e.g. `photo-album`
   - **Type**: Regional (cheaper / lower latency for a single-region Vercel deploy)
   - **Region**: pick the region closest to your Vercel deployment (e.g. `us-east-1` if the app is on `iad1`)
   - **Eviction**: leave default (or enable eviction if you prefer cache keys to drop under memory pressure)
4. Create the database.

Free tier is enough for v1 traffic (shared rate limits + short-TTL caches).

---

## 2. Copy REST credentials

On the database page (Details / Connect → **REST**):

| Console field | Env var |
|---------------|---------|
| `UPSTASH_REDIS_REST_URL` (HTTPS endpoint) | `UPSTASH_REDIS_REST_URL` |
| `UPSTASH_REDIS_REST_TOKEN` (standard write token) | `UPSTASH_REDIS_REST_TOKEN` |

Use the **standard** (read/write) token — not the read-only token. Rate limits, presence, cache writes, and idempotency all need write access.

Do **not** set `REDIS_URL` on Vercel. Production uses the REST vars only; `UPSTASH_REDIS_REST_*` takes precedence when both are present.

---

## 3. Environment variables

| Variable | Value |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://<name>-<id>.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Standard REST token from the console |

Optional (defaults are fine for most deploys):

| Variable | Default | Purpose |
|----------|---------|---------|
| `CACHE_TTL_EVENT` | `900` | Token → event lookup |
| `CACHE_TTL_FEED` | `30` | Gallery feed slices |
| `CACHE_TTL_WALL` | `60` | Contributor wall aggregation |
| `CACHE_TTL_LOOKUP` | `3600` | View / invite lookup APIs |
| `PRESENCE_TTL_SEC` | `90` | Guest wall online window |
| `IDEMPOTENCY_TTL_SEC` | `86400` | Upload dedupe window |

### Production (Vercel)

Set the two `UPSTASH_REDIS_REST_*` variables in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you want shared rate limits there). Redeploy after changing them:

```bash
make deploy:prod
```

CLI alternative (from the project root, with Vercel linked):

```bash
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

### Local testing against Upstash (optional)

Keep Docker Redis for day-to-day work. To point a local server at Upstash temporarily, uncomment and fill in `.env.local`:

```bash
# UPSTASH_REDIS_REST_URL=https://….upstash.io
# UPSTASH_REDIS_REST_TOKEN=…
```

Restart `make app:dev`. Comment them out again when done so local traffic does not hit the prod database.

---

## 4. Verify

1. Deploy with the Upstash env vars set (or run locally with them in `.env.local`).
2. Hit a rate-limited path a few times (e.g. host login or invite lookup) — should return `200`, not silent in-memory-only behavior across multiple serverless instances.
3. Open an event gallery and wall tab — responses should succeed; wall online indicators use Redis sorted sets.
4. In the Upstash console → **Data Browser** / metrics, confirm keys appear (rate-limit counters, cache keys, presence members) after traffic.

Quick REST smoke test (replace URL and token):

```bash
curl "https://YOUR_DB.upstash.io/set/photo-album-ping/ok/EX/60" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl "https://YOUR_DB.upstash.io/get/photo-album-ping" \
  -H "Authorization: Bearer YOUR_TOKEN"
# → {"result":"ok"}
```

---

## Troubleshooting

### App works but rate limits reset per request / no cache

- Both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set. If either is missing, [`lib/upstash.ts`](../lib/upstash.ts) returns `null` and the app falls back (in-memory rate limit / no cache).
- Confirm the vars are on the **Production** environment and you redeployed after adding them.
- Check Vercel function logs for fetch failures (wrong URL, revoked token).

### `401` / empty results from Upstash

- Recreate/reset the token in the Upstash console and update `UPSTASH_REDIS_REST_TOKEN`.
- Confirm you used the **standard** token, not read-only.

### High latency

- Move the Redis database to a region near your Vercel deployment region.
- Prefer **Regional** over Global for a single-region app.

---

## Related

- Local Redis: [getting-started.md](./getting-started.md)
- Production database: [supabase-setup.md](./supabase-setup.md)
- Production storage: [r2-setup.md](./r2-setup.md)
- Client: [`lib/upstash.ts`](../lib/upstash.ts), [`lib/rate-limit.ts`](../lib/rate-limit.ts), [`lib/cache.ts`](../lib/cache.ts)
