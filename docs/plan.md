# Plan: Private Event Memory Collection Platform

## Overview

Full-stack Next.js 16 (App Router) + PostgreSQL app for hosts to gather photos/videos from guests. Guests authenticate with personal invite codes or event codes (signed-cookie session); hosts use a private admin token. Deployed via Docker Compose with optional Pangolin/Newt tunnel for public HTTPS.

Local development runs via Docker Compose for infrastructure — no cloud accounts required. PostgreSQL and MinIO are S3/Postgres-compatible so the same application code runs unchanged in all environments. Day-to-day dev uses **`make docker:up` + `make app:dev`**; see the [Makefile](../Makefile) and [AGENTS.md](../AGENTS.md).

---

## Stack

| Layer | Local Dev | Production |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Tailwind CSS 4) | same |
| Backend | Next.js dev server (`make app:dev`) | Next.js in Docker (`make docker:full`) |
| Database | PostgreSQL 16 container (`make docker:up`) | PostgreSQL 16 container |
| Storage | MinIO container (S3-compatible) | MinIO container (S3-compatible) |
| Deployment | `make docker:up` + `make app:dev`, or `make docker:full` | `make docker:full` + Pangolin/Newt (see [deploy.md](./deploy.md)) |

---

## Key Libraries

| Library | Purpose |
|---|---|
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Presigned URL generation |
| `qrcode.react` | QR code rendering |
| `react-dropzone` | Drag-and-drop upload UI |
| `yet-another-react-lightbox` | Gallery lightbox viewer |
| `react-hook-form` + `zod` | Form handling and validation |
| `date-fns` | Timeline date grouping and formatting |
| `sharp` | Server-side image thumbnail generation |
| `nanoid` | Short token generation |
| `bcryptjs` | Admin token hashing |

---

## Database Schema (Prisma)

| Model | Key Fields |
|---|---|
| `Event` | `id`, `name`, `description`, `eventDate`, `hostName`, `accessMode` (`INVITE_ONLY`/`EVENT_CODE`/`BOTH`), `eventCode` (optional unique), `accessToken`, `viewToken`, `adminToken` (bcrypt), `adminTokenLookup` (SHA-256 index), `createdAt` |
| `EventMoment` | `id`, `eventId`, `name`, `sortOrder` — default moments created at event setup |
| `EventPrompt` | `id`, `eventId`, `text`, `sortOrder`, `isActive` — photo challenges |
| `Post` | `id`, `eventId`, `caption`, `uploaderName`, `takenAt`, `uploadedAt`, `momentId`, `promptId` — gallery item; owns reactions & comments |
| `Media` | `id`, `eventId`, `postId`, `url`, `thumbnailUrl`, `type` (`PHOTO\|VIDEO\|TEXT\|AUDIO`), `sortOrder` — one or more per post |
| `Reaction` | `id`, `postId`, `emoji`, `guestName`, `createdAt` — unique(`postId`, `guestName`, `emoji`) |
| `Comment` | `id`, `postId`, `content`, `authorName`, `createdAt` |
| `Guest` | `id`, `eventId`, `name`, `joinedAt` — unique(`eventId`, `name`) |
| `Invitation` | `id`, `eventId`, `code`, `groupName` — unique(`eventId`, `code`); one per household |
| `InvitationMember` | `id`, `invitationId`, `name` — members of a household invitation |

---

## Access Control

- **Host access** — `HOST_ACCESS_SECRET` gates `/create` and `POST /api/events`; host logs in at `/host/login` (`host_access` cookie).
- **Access modes** (per event): `INVITE_ONLY`, `EVENT_CODE`, or `BOTH` — set at creation.
- **Personal invite code** (6-char uppercase alphanumeric, e.g. `ZQS07Y`): configured via `Invitation` + `InvitationMember` records (manual rows or file upload `groupName-guestName-code`). Entered on home page; guest picks name from member list.
- **Event code** (`Event.eventCode`, 4–12 uppercase alnum): shared code + guest name on home page; full upload access when mode allows.
- **Guest session**: HMAC-signed HTTP-only cookie (`session`), payload `{ eventId, invitationId | null, guestName }`. `proxy.ts` requires valid cookie on `/event/*`; layout verifies invite membership or event-code guest row.
- **Guest access token** (8-char, e.g. `ABC12345`): keys URL `/event/ABC12345`; guests never type it — login redirects there.
- **View token** (8-char): URL `/view/{viewToken}`; read-only gallery. Resolved via `GET /api/events/lookup?code=`.
- **Admin token** (UUID): host-only at `/admin/{adminToken}`; bcrypt hash + SHA-256 lookup in DB.
- Auth API: `POST /api/auth/lookup`, `POST /api/auth/login`, `POST /api/auth/event-code`, `POST /api/auth/logout`, `POST /api/auth/host/login`, `POST /api/auth/host/logout`.
- Guest write APIs require `accessToken` in request body (see [docs/qa-remediation.md](qa-remediation.md))
- IP-based rate limits on event creation, presigned uploads, media recording, and invite-code auth attempts
- Guests never see or need the admin token

---

## Project Structure

```
photo-album/
├── Makefile                       # Task runner — preferred dev entry point (`make help`)
├── docker-compose.yml             # PostgreSQL + MinIO (+ app under profile "full")
├── Dockerfile                     # Multi-stage build for make docker:full
├── app/
│   ├── page.tsx                           # Home: invite login, event code, host-gated create
│   ├── host/login/page.tsx                # Platform host login
│   ├── create/page.tsx                    # Event creation (access mode, guest list)
│   ├── event/[token]/
│   │   ├── layout.tsx                     # Access token + guest session validation
│   │   ├── page.tsx + GalleryClient.tsx   # Gallery / timeline (PostCard feed)
│   │   ├── upload/                        # UploadClient + tabs (photo, text, audio)
│   │   └── wall/page.tsx                  # Guest contribution wall
│   ├── view/[viewToken]/                  # View-only gallery
│   ├── admin/[adminToken]/
│   │   ├── page.tsx                       # Host admin dashboard + export
│   │   └── guests/page.tsx                # Invite list + joined guests
│   └── api/
│       ├── auth/                          # Guest + host auth
│       ├── events/                        # Create, lookup, posts list, moments, prompts
│       ├── posts/                         # Create/delete posts
│       ├── media/                         # Single-item record, file proxy, admin delete
│       ├── upload/presigned/              # Presigned PUT URLs
│       ├── reactions/, comments/          # Post engagement
│       └── admin/[adminToken]/            # Export, guest/invite CRUD
├── components/
│   ├── gallery/                           # PostCard, MediaLightbox, CalendarNav
│   ├── engagement/                        # ReactionBar, CommentPanel
│   ├── admin/                               # AdminMediaGrid, managers, export
│   └── ui/                                # InviteLogin, TokenInput, HostAccessLogin, …
├── lib/
│   ├── db.ts, s3.ts, thumbnail.ts, tokens.ts, validations.ts, event-auth.ts
│   ├── post-helpers.ts                    # Post create/delete, thumbnail helpers
│   ├── session-*.ts, host-access-*.ts     # Signed cookies (Edge-safe crypto)
│   ├── invite-import.ts, invitation-groups.ts, admin-guests.ts
│   └── rate-limit.ts, upload-queue.ts, upload-limits.ts, …
├── prisma/schema.prisma
├── proxy.ts                               # Guest session + host access guards
└── .env.local.example
```

---

## Implementation Phases

### Phase 1 — Project Foundation

1. Scaffold Next.js 16 with TypeScript + Tailwind CSS 4 via `create-next-app`
2. Install all dependencies listed above
3. Write `docker-compose.yml` with two services:
   - **`db`** — `postgres:16-alpine`, port `5432`, volume `pgdata`
   - **`storage`** — `minio/minio:latest`, port `9000` (API) + `9001` (console), volume `miniodata`; startup command creates the default bucket via `mc`
4. Run `make setup` (or `make env` + `make docker:up` + `make db:migrate`)
5. Implement `lib/db.ts`, `lib/s3.ts`, `lib/tokens.ts`, `lib/validations.ts`

### Phase 2 — Event Creation & Access

6. `POST /api/events` — creates event with access/view/admin tokens, access mode, optional guest list and event code
7. `/create` page — form with access mode, guest list builder, event code; success screen with QR codes and links
8. `/` home page — invite login, event code entry, host-gated "Create an Event" CTA
9. `proxy.ts` — guest session required on `/event/*`; host access required on `/create`
10. `/event/[token]/layout.tsx` — validates token against DB + session membership

### Phase 3 — Media Upload

11. `POST /api/upload/presigned` — validates access token + file MIME type (`image/*` or `video/*` only), returns S3 presigned PUT URL (15-min expiry) + object key
12. `POST /api/posts` — records multi-photo/video batch (one post, many media rows)
13. `POST /api/media` — records text/audio (single media per post)
14. Guest name from invite/event-code login; `GuestNamePrompt` fallback when no session name
15. `/event/[token]/upload` — react-dropzone batch upload, text tab, audio tab

### Phase 4 — Gallery & Timeline

16. `GET /api/events/[token]/media` — returns posts (with nested media), sorted by `takenAt` / `uploadedAt`
17. `GalleryClient` — day-grouped feed of `PostCard`s
18. `PostCard` — feed card per post; carousel for multi-photo; inline reactions/comments
19. `MediaLightbox` — full-resolution viewer for photos/videos in a post

### Phase 5 — Engagement

20. `POST /api/reactions` — toggles an emoji reaction (add if absent, remove if present); 5 fixed emoji options
21. `GET / POST /api/comments` — list and submit comments per post
22. `ReactionBar` + `CommentPanel` on posts
23. `/event/[token]/wall` — guest initials with upload counts

### Phase 6 — Admin Dashboard

24. `/admin/[adminToken]` — validates bcrypt-hashed token, renders event overview + upload stats
25. QR code display + copyable guest/admin links section
26. Post grid with per-item delete → `DELETE /api/posts/[id]` (removes DB rows + storage)
27. Guest list + invite management at `/admin/{adminToken}/guests`

### Phase 7 — Polish & Deploy

28. `next.config.ts` — add `remotePatterns` for MinIO hostname to enable `next/image` optimisation
29. Mobile-first Tailwind polish (upload flow especially)
30. Run full verification checklist locally (`make docker:up` + `make app:dev`, or `make share:local` for LAN)
31. Deploy with `make docker:full` + configure Pangolin/Newt (see [deploy.md](./deploy.md))
32. Smoke-test all flows on production URL

---

## Upload Flow (Presigned URL)

```
Client                        API Route                    MinIO
  |                               |                              |
  |-- POST /api/upload/presigned -->                             |
  |   { filename, mimeType, token }                              |
  |                               |-- validate token             |
  |                               |-- validate MIME type         |
  |                               |-- getSignedUrl (PUT, 15min) -->
  |<-- { presignedUrl, objectKey } -                             |
  |                               |                              |
  |-- PUT {presignedUrl} (file) --------------------------------->
  |<-- 200 OK ---------------------------------------------------|
  |                               |                              |
  |-- POST /api/posts ------------>                              |
  |   { items[], caption, ... }                                  |
  |                               |-- INSERT Post + Media rows   |
  |<-- { post record } ----------                                |
```

> `S3_ENDPOINT` in `.env.local` determines whether requests go to MinIO or R2; no code changes needed between environments.

---

## Environment Variables

`.env.local.example` (committed, pre-filled for local containers):

```bash
# Database — local container default
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/photoalbum

# S3-compatible storage
# Local (MinIO):   S3_ENDPOINT=http://localhost:9000
# Production (R2): S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=photo-album
S3_PUBLIC_URL=http://localhost:9000/photo-album   # MinIO public base URL

# Cloudflare R2 extras (production only — leave blank locally)
R2_ACCOUNT_ID=

# App
ADMIN_BCRYPT_ROUNDS=12

# Platform host login — required to create events
HOST_ACCESS_SECRET=

# Guest session cookie signing key (required in production; dev falls back to an insecure default)
SESSION_SECRET=dev-insecure-session-secret

# Docker full stack (make docker:full / make share:local) — see .env.local.example
```

> **Note:** Rename `R2_*` references in code to the generic `S3_*` names above so the same client works with MinIO locally and R2 in production — only `S3_ENDPOINT` needs to change.

---

## Verification Checklist

- [x] Create event → tokens generated (access + view + admin), QR codes render
- [x] `/event/{accessToken}` → access granted and gallery loads
- [x] `/view/{viewToken}` → view-only gallery (no upload, no engagement)
- [x] `/event/INVALID` → redirected to home with error
- [x] Home token lookup → routes upload codes to `/event/` and view codes to `/view/`
- [x] Upload photo → presigned URL returned, file in storage, metadata in DB, appears in gallery
- [x] Upload video → `thumbnailUrl: null`, video placeholder in grid
- [x] Text / audio memories → stored and displayed
- [x] Add reaction → toggles correctly (add / remove)
- [x] Add comment → stored and rendered under media item
- [x] Admin: delete media → removed from gallery, DB, and storage
- [x] Admin: export ZIP → downloads media + metadata.json
- [x] Guest wall → contributors with uploads appear
- [x] Rate limiting → 429 after threshold on event creation
- [x] API auth → guest writes require access token
- [ ] Mobile: `make share:local` → scan QR on phone → upload → appears on desktop gallery
- [ ] `make docker:full` + full smoke test on production URL (Pangolin)

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Authentication | Per-guest invite code (from CSV) → signed cookie session | Guests log in with a code from their invitation; households share a code and pick their name |
| Guest identity | Name chosen at invite-code login | Pre-filled into `localStorage` + upserted to `Guest` DB table; `GuestNamePrompt` skipped |
| Guest token format | 8-char uppercase nanoid (`ABC12345`) | Easy to type manually if QR not available |
| Admin token format | UUID | High-entropy; never needs to be typed |
| Token storage | Guest token: plaintext; Admin token: bcrypt hash | Admin token has higher sensitivity |
| Local dev infrastructure | Docker Compose (PostgreSQL + MinIO) | No cloud accounts needed to run locally; identical S3 + Postgres APIs |
| File storage | Cloudflare R2 (prod) / MinIO (local) | Zero egress fees on R2; MinIO is fully S3-compatible for local parity |
| Photo thumbnails | Generated server-side via `sharp` on post/media recording (480px wide, webp) | Feed/grid use thumbnail; lightbox uses full-res. Best-effort — never blocks upload |
| Video thumbnails | `null` in v1 (generic placeholder shown) | Avoids ffmpeg complexity; can add async generation later |
| Event expiry | None — permanent gallery by default | Core feature: memories preserved long-term |

---

## Further Considerations (Post-v1)

1. **Video thumbnail generation** — Add a background job using `fluent-ffmpeg` to extract first frames asynchronously after upload
2. ~~**Rate limiting**~~ — Done: IP-based limits on event creation, presigned uploads, media recording (`lib/rate-limit.ts`)
3. ~~**R2 object deletion**~~ — Done: `DELETE /api/media/[id]` removes S3 object when URL matches `S3_PUBLIC_URL`
4. ~~**Bulk download**~~ — Done: admin ZIP export at `/api/admin/{adminToken}/export`
5. ~~**Event sharing page**~~ — Done: view-only gallery at `/view/{viewToken}`
6. ~~**Photo thumbnails**~~ — Done: `lib/thumbnail.ts` generates a webp thumbnail on upload; feed/grid use it, lightbox uses full-res
7. ~~**Distributed rate limits**~~ — Done: Docker Redis via `REDIS_URL` (in-memory fallback when unset)
8. ~~**Media pagination**~~ — Backend supports it: `GET /api/events/[token]/media?cursor=&limit=` returns `{ items, nextCursor }`; opt-in so existing callers are unaffected. Gallery UI still loads the full list — wiring up infinite scroll on the client is future work
