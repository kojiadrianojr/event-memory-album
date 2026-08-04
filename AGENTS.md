# Photo Album — Agent Instructions

Full-stack private event photo-sharing app. See [docs/plan.md](docs/plan.md) for the full spec, schema, and phased implementation plan. QA fixes are tracked in [docs/qa-remediation.md](docs/qa-remediation.md). Human-oriented setup and testing: [docs/getting-started.md](docs/getting-started.md).

## Implementation Status

Core v1 is **feature-complete** for local development. Phases 1–7 in `docs/plan.md` and QA remediation phases 1–6 are done. Remaining before production sign-off:

- Full smoke test on a Vercel production deploy (`make deploy:prod`)
- End-to-end mobile test via LAN sharing (`make share:local`)

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Database**: PostgreSQL 16 via Prisma ORM (local: Docker; prod: Supabase)
- **Storage**: S3-compatible object store (local: MinIO via Docker; prod: Cloudflare R2)
- **Cache / rate limits**: Redis 7 (local: Docker; prod: Upstash Redis REST)
- **Deploy**: Vercel (API routes as Node.js serverless functions)
- **Tests**: Vitest unit tests in `lib/__tests__/` (no DB/containers required)

## Dev Environment

All common tasks run through the **Makefile**. Run `make` or `make help` for the full list.

### First-time setup

```bash
make setup    # .env.local + npm install + docker:up + db:migrate
make app:dev  # Next.js dev server → http://localhost:3000
```

### Typical daily dev (app on host, infra in Docker)

```bash
make docker:up    # Postgres + MinIO
make app:dev        # hot-reload Next.js on :3000
make app:test       # Vitest (anytime; no containers needed)
```

### Full stack in Docker (no local Node dev server)

```bash
make docker:full    # build + run app + db + storage in containers
make share:local    # same, but prints a LAN URL for phone testing
```

### Makefile reference

| Command | Purpose |
|---------|---------|
| `make setup` | First-time bootstrap (env, deps, containers, migrations) |
| `make env` | Copy `.env.local.example` → `.env.local` (never overwrites) |
| `make app:install` | `npm install` |
| `make app:dev` | Next.js dev server |
| `make app:build` | Production build |
| `make app:start` | Build + production server locally |
| `make app:lint` | ESLint |
| `make app:test` | Vitest unit tests |
| `make docker:up` | Start Postgres + MinIO + Redis (detached) |
| `make docker:down` | Stop all containers |
| `make docker:reset` | Stop containers and wipe volumes |
| `make docker:logs` | Follow container logs |
| `make docker:full` | Build and run entire stack in Docker |
| `make share:local` | Full stack + LAN share URL |
| `make db:migrate` | Apply Prisma migrations (dev) |
| `make db:migrate:deploy` | Apply migrations to production (Supabase) |
| `make db:generate` | Regenerate Prisma client |
| `make db:studio` | Open Prisma Studio |
| `make db:push` | Push schema without migration (prototyping only) |
| `make deploy:prod` | Deploy to Vercel production |
| `make deploy:preview` | Deploy a Vercel preview |

**Services (local):**

- App: http://localhost:3000
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)
- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/photoalbum`
- Redis: `redis://localhost:6379` (rate limiting; optional — falls back to in-memory when unset)

Copy env vars from `.env.local.example`. Set `HOST_ACCESS_SECRET` before creating events. Production database: [docs/supabase-setup.md](docs/supabase-setup.md). Production storage: [docs/r2-setup.md](docs/r2-setup.md). Production Redis: [docs/upstash-setup.md](docs/upstash-setup.md).

## Project Structure

```
app/
  page.tsx                      # Home: InviteLogin, TokenInput (event code), host-gated Create CTA
  host/login/page.tsx           # Platform host login (HOST_ACCESS_SECRET)
  create/page.tsx               # Event creation (access mode, guest list, event code)
  event/[token]/
    layout.tsx                  # Access token + guest session validation
    page.tsx + GalleryClient.tsx
    upload/                     # UploadClient, MediaUploadTab, TextMemoryTab, VoiceMemoTab
    wall/page.tsx               # Guest contribution wall
  view/[viewToken]/             # View-only gallery
  admin/[adminToken]/
    page.tsx                    # Host admin dashboard
    guests/page.tsx             # Invite list + joined guests management
  api/
    auth/                       # lookup, login, event-code, logout, host/login, host/logout
    events/                     # create, lookup, media (posts list), moments, prompts
    posts/                      # POST create post; DELETE post (admin)
    media/                      # POST single-item (text/audio); GET file proxy; DELETE (admin)
    upload/presigned/           # Presigned PUT URLs
    reactions/, comments/       # Engagement (scoped to posts)
    guests/                     # Guest name registration
    admin/[adminToken]/         # export, guests CRUD
components/
  gallery/                      # PostCard, MediaLightbox, CalendarNav
  engagement/                   # ReactionBar, CommentPanel, ReactionReactorsSheet
  event/                        # EventChrome (bottom nav)
  admin/                        # AdminMediaGrid, AdminExportButton, moments/prompts/guests managers
  ui/                           # QRCodeDisplay, InviteLogin, InviteListBuilder, HostAccessLogin,
                                # TokenInput, GuestNamePrompt, SwitchGuestButton, CopyButton, …
lib/
  db.ts, s3.ts, redis.ts, cache.ts, cache-keys.ts, cache-invalidate.ts, upstash.ts
  thumbnail.ts, tokens.ts, validations.ts, event-auth.ts, rate-limit.ts
  idempotency.ts, presence.ts, wall-contributors.ts
  post-helpers.ts               # Post create/delete, thumbnail helpers, shared includes
  upload-queue.ts / upload-limits.ts  # Client upload retry + max photos per post (10)
  session-crypto.ts / session.ts      # HMAC-signed guest session cookie
  host-access-*.ts              # Host platform login cookie + API guard
  invite-import.ts / invitation-groups.ts / invite-code.ts
  event-code.ts                 # Client-safe event code generator
  admin-guests.ts               # Admin guest/invite helpers
  export-filename.ts            # ZIP export naming
  media-url.ts, mime-from-url.ts, exif.ts, guest-storage.ts, safe-date.ts, safe-decode.ts
prisma/schema.prisma
proxy.ts                        # Edge guard: guest session on /event/*; host access on /create
Dockerfile                      # Multi-stage image for make docker:full
docker-compose.yml              # db + storage (+ app under profile "full")
Makefile                        # Task runner — preferred entry point for dev commands
```

## Data Model (Posts + Media)

Gallery items are **`Post`** records; each post holds one or more **`Media`** rows (multi-photo uploads share one caption/reactions/comments).

| Model | Role |
|-------|------|
| `Event` | Tokens, access mode, event code, host metadata |
| `Invitation` / `InvitationMember` | Personal invite codes (household + member names) |
| `Post` | Caption, uploader, takenAt, moment/prompt tags; owns reactions & comments |
| `Media` | PHOTO / VIDEO / TEXT / AUDIO file metadata linked to a post |
| `Reaction` / `Comment` | Scoped to `postId` (not individual media files) |
| `Guest` | Registered guest names (`eventId` + `name` unique) |
| `EventMoment` / `EventPrompt` | Timeline chapters and photo challenges |

`GET /api/events/[token]/media` returns **posts** (with nested media), despite the path name.

## Access Control

- **Host access secret** — `HOST_ACCESS_SECRET` gates event creation. When unset, `POST /api/events` returns 403 and `/create` redirects to `/host/login?error=not-configured`. Hosts log in at `/host/login`; success sets an HTTP-only `host_access` cookie (HMAC-signed with `SESSION_SECRET`, independent of the guest `session` cookie). Home page hides "Create an Event" until authenticated; shows "Host login" when configured but not logged in.
- Host auth API: `POST /api/auth/host/login`, `POST /api/auth/host/logout`. Rate-limited via `RATE_LIMITS.hostAccessAuth`.
- **Access modes** (set at event creation on `/create`):
  - `INVITE_ONLY` — guests must use a personal 6-char invite code from the host's guest list.
  - `EVENT_CODE` — guests enter the event's shared `eventCode` (4–12 uppercase alnum) plus their name on the home page.
  - `BOTH` — either path works.
- **Personal invite code** — 6-char uppercase alphanumeric (e.g. `ZQS07Y`), one per household via `Invitation` + `InvitationMember`. Codes are unique per event but may repeat across events; when a code matches multiple events, `InviteLogin` shows an event picker before member selection. Entered on the home page (`InviteLogin`); guest picks their name from the member list.
- **Event code** — stored on `Event.eventCode` (auto-generated by default, host may customize). Entered on the home page with guest name (`TokenInput` → `POST /api/auth/event-code`).
- **Guest session** — HMAC-signed HTTP-only cookie (`session`), payload `{ eventId, invitationId | null, guestName }`. `proxy.ts` requires a valid signed cookie on `/event/*`; `app/event/[token]/layout.tsx` verifies `session.eventId` matches and either the name belongs to the invitation or (for event-code sessions) a `Guest` row exists and `accessMode` allows event-code access.
- **Guest access token** — 8-char nanoid keys `/event/ABC12345`; guests never type it — login redirects there once authenticated.
- **View token** — 8-char nanoid, URL `/view/{viewToken}`; read-only gallery. Resolved via `GET /api/events/lookup?code=`. Not gated by guest session. View-only users can see reaction counts and who reacted (read-only list); they cannot add reactions or comments.
- **Admin token** — UUID, URL `/admin/{adminToken}`; bcrypt hash + SHA-256 lookup index. Not gated by guest session; shown **once** at creation.
- Guest auth API: `POST /api/auth/lookup` (returns `invitations[]` with event metadata; multiple matches when the same code exists on different events), `POST /api/auth/login` (`invitationId` + `guestName`), `POST /api/auth/event-code`, `POST /api/auth/logout`. Rate-limited via `RATE_LIMITS.inviteAuth`.
- Guest list at creation: manual rows or file upload parsed as `groupName-guestName-code` (`InviteListBuilder` + `lib/invite-import.ts`). Admin can manage invites at `/admin/{adminToken}/guests`.
- `SESSION_SECRET` signs session cookies (required in production; dev falls back to an insecure default).

## Storage Convention

`S3_ENDPOINT` is the only difference between local MinIO and production R2. No code changes between environments.

```bash
# Local (.env.local)
S3_ENDPOINT=http://localhost:9000

# Production
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
```

All S3 credentials use generic `S3_*` names (not `R2_*`) so `lib/s3.ts` is environment-agnostic. For `make docker:full` / `make share:local`, see `DOCKER_DATABASE_URL`, `HOST_IP`, and `COOKIE_SECURE` in `.env.local.example`.

## Key Conventions

- Use `lib/validations.ts` Zod schemas for all API input validation and client-side form validation — never duplicate schemas
- **Upload flow**: `POST /api/upload/presigned` → client PUT to storage → record metadata:
  - **Multi photo/video batch**: `POST /api/posts` (one post, up to 10 media items — see `lib/upload-limits.ts`)
  - **Text memory or single audio**: `POST /api/media` (creates a post with one media row)
- Guest write APIs require the 8-char `accessToken` in the request body — view tokens are rejected
- Rate limits (IP-based, 429 on exceed): event creation, presigned uploads, media/post recording, host access login, invite auth — see `lib/rate-limit.ts` and `.env.local.example`. Local Docker Redis via `REDIS_URL`; production Upstash Redis REST via `UPSTASH_REDIS_REST_*` (falls back to in-memory when neither is set).
- Redis caching (`lib/cache.ts`): event token lookups, gallery feed/moments/prompts/wall API responses, invite lookup — TTLs via `CACHE_TTL_*` env vars; graceful DB fallback when Redis is unset.
- Guest wall presence (`lib/presence.ts`): heartbeats on the wall tab only; online indicators via sorted-set TTL window (`PRESENCE_TTL_SEC`).
- Upload idempotency (`lib/idempotency.ts`): optional `idempotencyKey` on `POST /api/posts` and `POST /api/media` prevents duplicate posts on client retry; requires Redis/Upstash to dedupe.
- Guest name comes from invite-code or event-code login (stored in `localStorage`; `GuestNamePrompt` only if no session name). Upserted into `Guest`. "Not you?" (`SwitchGuestButton`) clears storage and calls `POST /api/auth/logout`.
- Guest write APIs still trust the name in the request body (pre-filled from session); the signed session cookie is the gate
- Photo thumbnails: generated server-side via `sharp` during post/media recording; feed uses `mediaFileUrl(id, { thumb: true })`, lightbox uses full size. Best-effort — failures never block upload
- Reactions: shared helpers in `lib/reactions.ts`; `ReactionBar` supports feed/lightbox layouts. Tap emoji to toggle (guests only); tap count to open reactor list (`ReactionReactorsSheet`). Multi-media posts show a stack badge in the feed; lightbox uses YARL Counter plus a desktop side engagement panel (`md+`).
- Video thumbnails are `null` in v1 — generic placeholder in UI
- Delete: `DELETE /api/posts/[id]` (admin) removes post, media rows, reactions, comments, and storage objects
- `bcryptjs` (not `bcrypt`) — pure JS, no native build needed on Vercel
- `proxy.ts` (not `middleware.ts`) — Next.js proxy matcher for `/event/*` and `/create`; crypto helpers in `*-crypto.ts` files must stay Edge-safe (Web Crypto only)
