# Self-Hosted Deployment

Photo Album runs entirely in Docker: PostgreSQL, Redis, MinIO, the Next.js app, and an optional [Pangolin](https://github.com/fosrl/pangolin) **Newt** tunnel for public HTTPS access.

Local development uses the same stack — only the bind address and secrets change for production.

---

## 1. Configure environment

Copy and edit `.env.local` from the template:

```bash
make env   # copies .env.local.example if missing
```

Set these before going live:

| Variable | Purpose |
|----------|---------|
| `HOST_ACCESS_SECRET` | Platform host login secret |
| `SESSION_SECRET` | Guest session cookie signing key |
| `POSTGRES_PASSWORD` | Postgres container password |
| `S3_SECRET_ACCESS_KEY` | MinIO root password |
| `COOKIE_SECURE` | `true` when served over HTTPS |
| `HOST_IP` | Address browsers use to reach MinIO for uploads |
| `PANGOLIN_ENDPOINT` | Your Pangolin server URL |
| `NEWT_ID` / `NEWT_SECRET` | Newt client credentials from Pangolin |

See [`.env.production`](../.env.production) for a production-oriented template.

> **Uploads:** Guests PUT files directly to MinIO via presigned URLs when `COOKIE_SECURE=false` (LAN sharing). For HTTPS access (Pangolin or reverse proxy), uploads are proxied through the app automatically (`COOKIE_SECURE=true` → `S3_DIRECT_UPLOAD` defaults to direct mode). Set `HOST_IP` for presigned LAN mode or for the public URL stored in the database.

---

## 2. Start the stack

```bash
make docker:full
```

This builds the app image and starts all services under the `full` profile:

| Service | Role |
|---------|------|
| `db` | PostgreSQL 16 |
| `redis` | Rate limits, caching, presence, idempotency |
| `storage` | MinIO (S3-compatible object store) |
| `app` | Next.js production server on port 3000 |
| `newt` | Pangolin tunnel (when `PANGOLIN_*` vars are set) |

Migrations run automatically on app container start (`docker-entrypoint.sh` → `prisma migrate deploy`).

To apply migrations manually against a running Postgres:

```bash
make db:migrate:deploy
```

---

## 3. Pangolin / Newt tunnel

When `PANGOLIN_ENDPOINT`, `NEWT_ID`, and `NEWT_SECRET` are set in `.env.local`, the `newt` container starts with `make docker:full` and registers with your Pangolin server.

In the Pangolin dashboard, point the resource at the app container (`http://app:3000` from Newt's perspective, or whatever target your Pangolin config expects).

For dev access through the tunnel domain, add it to `allowedDevOrigins` in [`next.config.ts`](../next.config.ts).

---

## 4. Verify

1. Open the app URL (local `http://localhost:3000` or your Pangolin domain).
2. Log in as host → create a test event.
3. Upload a photo → confirm it appears in the gallery.
4. Check MinIO console at `http://localhost:9001` (default credentials in `.env.local.example`).
5. Run unit tests: `make app:test`.

---

## Operations

```bash
make docker:logs     # follow all container logs
make docker:down     # stop the stack
make docker:reset    # stop and wipe DB + storage volumes
make share:local     # full stack + print LAN URL for phone testing
```

---

## Related

- [getting-started.md](./getting-started.md) — features, testing, daily dev commands
- [AGENTS.md](../AGENTS.md) — architecture and conventions
