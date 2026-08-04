# Supabase Setup

Photo Album uses **Supabase PostgreSQL** as the production database. The app talks to Postgres through **Prisma** only — it does not use Supabase Auth, Storage, or the Data API (PostgREST).

Local development continues to use Docker Postgres (`make docker:up`). Supabase replaces that container in production (Vercel).

---

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose a region close to your Vercel deployment.
3. Save the database password — you will need it for connection strings.

---

## 2. Create a Prisma database user

In the Supabase dashboard, open **SQL → New query** and run the script in [`prisma/supabase-prisma-user.sql`](../prisma/supabase-prisma-user.sql).

Replace `your_secure_password` with a strong password before running. Store it in your password manager — you will embed it in connection strings.

This dedicated `prisma` user makes it easier to monitor queries in Supabase's performance dashboard and keeps Prisma access separate from the default `postgres` role.

---

## 3. Get connection strings

In the dashboard, click **Connect** on your project.

You need two pooler URLs (Supavisor):

| Variable | Pool mode | Port | Used for |
|----------|-----------|------|----------|
| `DATABASE_URL` | **Transaction** | `6543` | App queries (Vercel serverless) |
| `DIRECT_URL` | **Session** | `5432` | Prisma migrations |

Both URLs use the `prisma` user from step 2:

```bash
# Transaction mode — append ?pgbouncer=true for Prisma + Supavisor
DATABASE_URL=postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Session mode — for migrations (prisma migrate deploy)
DIRECT_URL=postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

Replace `[PROJECT-REF]`, `[PASSWORD]`, and `[REGION]` with your values.

> **Local dev:** Keep `DATABASE_URL` and `DIRECT_URL` pointing at `localhost:5432` in `.env.local`. Only change them when running migrations against Supabase or configuring Vercel.

---

## 4. Apply migrations to Supabase

With Supabase URLs in your environment (temporarily in `.env.local` or exported in the shell):

```bash
make db:migrate:deploy
```

This runs `prisma migrate deploy` using `DIRECT_URL` and applies all migrations in `prisma/migrations/`.

Verify in Supabase **Table Editor** — you should see tables like `Event`, `Post`, `Media`, `Guest`, etc.

---

## 5. Configure Vercel environment variables

Set these in your Vercel project (**Settings → Environment Variables**):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Transaction-mode Supabase URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Session-mode Supabase URL (port 5432) |
| `SESSION_SECRET` | Random secret for guest session cookies |
| `HOST_ACCESS_SECRET` | Platform host login secret |
| `S3_ENDPOINT` | Cloudflare R2 endpoint — see [r2-setup.md](./r2-setup.md) |
| `S3_ACCESS_KEY_ID` | R2 access key |
| `S3_SECRET_ACCESS_KEY` | R2 secret key |
| `S3_BUCKET_NAME` | R2 bucket name |
| `S3_PUBLIC_URL` | R2 URL base for media keys |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL — see [upstash-setup.md](./upstash-setup.md) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `COOKIE_SECURE` | `true` |

The production build runs `prisma migrate deploy` automatically (see `package.json` `build` script), so `DIRECT_URL` must be set in Vercel before the first deploy.

Deploy:

```bash
make deploy:prod
```

---

## 6. Disable the Supabase Data API (recommended)

This app does not use PostgREST. Prisma connects directly to Postgres, and all access control is handled in Next.js API routes.

To reduce attack surface, disable the Data API in **Project Settings → API → Data API Settings**, or ensure `anon` / `authenticated` roles have no grants on your tables.

If you leave the Data API enabled, enable RLS on every table in `public` — otherwise rows may be readable via the REST API.

---

## Troubleshooting

### `prepared statement "s0" already exists`

`DATABASE_URL` is missing `?pgbouncer=true`, or you are using transaction-mode pooling without it. Add the query param to the port-6543 URL.

### Migration fails with connection timeout

Use `DIRECT_URL` (session mode, port 5432), not the transaction-mode URL. Confirm the `prisma` user password and project ref in the connection string.

### `Environment variable not found: DIRECT_URL`

Add `DIRECT_URL` to `.env.local` (local: same value as `DATABASE_URL`) or to Vercel env vars (production: session-mode Supabase URL).

### Tables not visible in Supabase dashboard

Migrations may not have run. Run `make db:migrate:deploy` with production URLs, or check Vercel build logs for `prisma migrate deploy` output.

---

## Quick reference

```bash
# Local development (Docker Postgres)
make setup          # first time
make docker:up      # start Postgres + MinIO + Redis
make app:dev        # Next.js on :3000

# Supabase (production database)
make db:migrate:deploy   # apply migrations to Supabase
make deploy:prod         # deploy to Vercel
```

See also: [getting-started.md](getting-started.md) for the full stack overview and [AGENTS.md](../AGENTS.md) for architecture details.
