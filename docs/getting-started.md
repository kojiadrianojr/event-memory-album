# Photo Album — Getting Started Guide

Private event photo-sharing platform. Hosts create events, guests upload photos and memories via a short code or QR link — no accounts or sign-in required.

This guide covers the **tech stack**, **features with testing instructions**, and a **step-by-step walkthrough** for hosts, guests, and developers.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Features & How to Test](#2-features--how-to-test)
3. [Step-by-Step Application Guide](#3-step-by-step-application-guide)
4. [Local Development Setup](#4-local-development-setup)
5. [Quick Reference](#5-quick-reference)

---

## 1. Tech Stack

### Core Framework

| Technology | Version | Purpose | Why It Matters |
|---|---|---|---|
| **Next.js** | 16 (App Router) | Full-stack React framework — pages, layouts, and API routes in one project | Provides server-rendered pages for fast loads, file-based routing, and serverless API handlers deployable to Vercel without a separate backend |
| **React** | 19 | UI component library | Powers all interactive client components (gallery, upload, lightbox, forms) |
| **TypeScript** | 5 | Static typing across frontend and backend | Catches errors at build time; shared types between API routes and components |
| **Tailwind CSS** | 4 | Utility-first styling | Mobile-first responsive design with consistent spacing, colors, and layout |

### Data & Storage

| Technology | Local Dev | Production | Purpose | Why It Matters |
|---|---|---|---|---|
| **PostgreSQL** | Docker (`postgres:16-alpine`) | Supabase | Relational database for events, media metadata, guests, reactions, comments | Stores all structured data; Prisma migrations keep schema consistent across environments |
| **Prisma ORM** | — | — | Type-safe database client and schema migrations | Single source of truth for the data model; auto-generated TypeScript types |
| **MinIO** | Docker | — | S3-compatible object storage for local dev | Lets you develop and test file uploads without cloud credentials |
| **Cloudflare R2** | — | Production | S3-compatible object storage | Stores photos, videos, and audio files with zero egress fees; same API as MinIO |

The app uses generic `S3_*` environment variables. Only `S3_ENDPOINT` changes between local MinIO and production R2 — **no code changes** between environments.

### Key Libraries

| Library | Purpose | Why It Matters |
|---|---|---|
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Generate presigned PUT URLs for direct client-to-storage uploads | Files never pass through the Next.js server, reducing bandwidth and latency on Vercel |
| `nanoid` | Generate 8-character guest/view tokens | Short, typeable codes for QR codes and manual entry |
| `bcryptjs` | Hash admin tokens before storage | Admin tokens are high-entropy UUIDs; bcrypt prevents exposure if the database is compromised |
| `sharp` | Server-side photo thumbnail generation | Creates optimized thumbnails for gallery grid performance |
| `exifr` | Extract EXIF date from uploaded photos | Groups photos by when they were taken, not just when uploaded |
| `react-dropzone` | Drag-and-drop file upload UI | Multi-file upload with progress indicators |
| `yet-another-react-lightbox` | Full-screen media viewer | Swipeable gallery with captions, reactions, and comments |
| `qrcode.react` | QR code rendering | Guests scan a code on their phone to join instantly |
| `react-hook-form` + `zod` | Form handling and validation | Shared Zod schemas in `lib/validations.ts` validate both client forms and API requests |
| `date-fns` | Date formatting and timeline grouping | Calendar navigation and sticky day headers in the gallery |
| `archiver` | ZIP file creation | Admin bulk export of all media + metadata |

### Deployment & Infrastructure

| Layer | Local | Production |
|---|---|---|
| App server | `npm run dev` (port 3000) | Vercel (Node.js serverless functions) |
| Database | Docker Compose → `localhost:5432` | Supabase PostgreSQL |
| File storage | Docker Compose → MinIO `localhost:9000` | Cloudflare R2 |
| Rate limiting | Redis (`REDIS_URL`) or in-memory | Upstash Redis REST (`UPSTASH_REDIS_REST_*`) |
| API caching / presence / idempotency | Redis (`REDIS_URL`) or passthrough | Upstash Redis REST (`UPSTASH_REDIS_REST_*`) |

### Architecture Overview

```
┌─────────────┐     presigned URL      ┌──────────────┐
│   Browser   │ ──────────────────────►│ MinIO / R2   │
│  (React UI) │                        │ (file store) │
└──────┬──────┘                        └──────────────┘
       │ API routes
       ▼
┌─────────────┐     Prisma ORM         ┌──────────────┐
│  Next.js    │ ──────────────────────►│  PostgreSQL  │
│  (Vercel)   │                        │  (metadata)  │
└─────────────┘                        └──────────────┘
```

**Upload flow:** Client requests a presigned URL → uploads file directly to storage → records metadata via API. The server never handles raw file bytes.

---

## 2. Features & How to Test

### Access Control

Three token types plus optional invite/event-code login. No user accounts.

| Token / login | Format | URL / entry | Capabilities |
|---|---|---|---|
| **Personal invite code** | 6-char (e.g. `ZQS07Y`) | Home page → pick name | Session cookie; upload, gallery, engagement (when event mode allows) |
| **Event code** | 4–12 uppercase alnum | Home page + guest name | Same as invite when `EVENT_CODE` or `BOTH` mode |
| **Guest access token** | 8-char (e.g. `ABC12345`) | `/event/{token}` | Upload, gallery, reactions, comments (after session login) |
| **View token** | 8-char | `/view/{viewToken}` | Read-only gallery (no upload, no engagement) |
| **Admin token** | UUID | `/admin/{adminToken}` | Full host dashboard, delete media, export, manage moments/prompts/guests |
| **Host access** | Platform secret | `/host/login` | Required before `/create` when `HOST_ACCESS_SECRET` is set |

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Valid guest token | Open `/event/{accessToken}` | Gallery loads; bottom nav shows Gallery, Upload, Guests |
| Invalid token | Open `/event/BADCODE` or `/event/abc` (wrong length) | Redirect to home with "That event code wasn't found" error |
| Home token lookup | Enter access token on home page | Routes to `/event/{token}` |
| Home view lookup | Enter view token on home page | Routes to `/view/{token}` |
| View-only gallery | Open `/view/{viewToken}` | Gallery loads; no upload tab, no reactions, no comments |
| API auth (guest writes) | `POST /api/posts` without `token` field | 400 or 403 response |
| View token on write API | POST with view token instead of access token | 403 Forbidden |

```bash
# Example: unauthenticated media POST should fail
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: application/json" \
  -d '{"type":"TEXT","caption":"test","uploaderName":"Test","eventId":"..."}'
# Expected: 400 (missing token)
```

---

### Event Creation

Hosts log in at `/host/login` (when `HOST_ACCESS_SECRET` is configured), then create events at `/create` with event name, host name, optional date, description, **access mode**, optional **guest list**, and optional **event code**.

On success, the app shows:
- QR codes for guest upload and view-only links
- Copyable URLs for guest, view-only, and admin access
- A warning that the **admin link is shown once only**

Default **moments** are created automatically: Ceremony, Cocktail Hour, Reception, Dance Floor.

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Host login | Set `HOST_ACCESS_SECRET` in `.env.local` → open `/create` without login | Redirect to `/host/login` |
| Create event | Host login → fill form at `/create` → submit | Success screen with tokens and QR codes |
| Required fields | Submit with empty event name | Validation error shown |
| Default moments | After creation, open admin dashboard | Four default moments listed |
| Admin token recovery | Leave success page, try to find admin token again | Not possible — must save on creation |
| Rate limit | Create 11+ events from same IP within 1 hour | 429 Too Many Requests with `Retry-After` header |

---

### Media Upload

Guests upload at `/event/{token}/upload` after entering their name once.

Supported media types:

| Type | Method | Notes |
|---|---|---|
| **Photo** | Drag-and-drop or file picker | EXIF date extracted for timeline; thumbnail generated server-side |
| **Video** | Drag-and-drop or file picker | Generic placeholder shown (no thumbnail in v1) |
| **Text memory** | Text tab → type and submit | Stored as TEXT media type |
| **Audio memory** | Audio tab → record in browser | Stored as AUDIO media type |

Uploads can be tagged with an **event moment** and/or a **photo prompt** (if the host has created prompts).

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Guest name prompt | First visit to event gallery or upload | Modal asks for name; stored in localStorage |
| Photo upload | Upload a `.jpg` or `.png` | Progress bar → success; photo appears in gallery |
| Multi-file upload | Drop 3 photos at once | All post as one gallery item with a shared caption (max 10 per post) |
| Video upload | Upload a `.mp4` | Appears in gallery with video placeholder icon |
| Text memory | Upload tab → Text → submit | Text card appears in gallery timeline |
| Audio memory | Upload tab → Audio → record → submit | Audio player appears in gallery |
| Caption | Add caption during photo upload | Caption visible in lightbox |
| Moment tagging | Select a moment before upload | Media associated with that moment; filterable in gallery |
| Prompt tagging | Click a prompt in gallery → upload | Upload pre-selects that prompt |
| "View my uploads" | After upload, click link | Gallery filtered to current guest's uploads |
| Switch guest | Click "Not you?" in header | Clears name; name prompt reappears |
| Invalid objectKey | POST media with wrong S3 key prefix | 400 Bad Request |

---

### Gallery & Timeline

The main gallery at `/event/{token}` displays all media grouped by calendar day.

Features:
- **Timeline grouping** — sticky date headers, sorted by `takenAt` (EXIF) or `uploadedAt`
- **Calendar navigation** — jump to a specific day
- **Moment filter** — filter by event moment (Ceremony, Reception, etc.)
- **Uploader filter** — "My uploads" or tap a guest on the wall
- **Photo prompts** — active prompts shown with response counts; tap to upload for that prompt
- **Lightbox** — full-screen viewer for photos and videos with caption, uploader, date, reactions, comments

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Timeline display | Upload photos on different days | Grouped under correct date headers |
| Calendar nav | Click a day in calendar strip | Scrolls/jumps to that day's media |
| Moment filter | Select "Reception" from moment dropdown | Only reception-tagged media shown |
| Lightbox | Click a photo thumbnail | Full-screen viewer opens; arrow keys navigate |
| Text in timeline | Upload a text memory | Shown as card in timeline (not in lightbox) |
| Empty gallery | New event with no uploads | "No photos yet" empty state |

---

### Engagement (Reactions & Comments)

Available on photos and videos in the gallery (not in view-only mode).

- **Reactions** — 5 fixed emojis: ❤️ 😂 😮 😢 👏 (toggle on/off per guest)
- **Comments** — free-text comments with author name

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Add reaction | Open lightbox → tap ❤️ | Count increments; emoji highlighted for your name |
| Remove reaction | Tap same emoji again | Count decrements; highlight removed |
| Add comment | Type comment → submit | Comment appears under media item |
| View-only block | Open `/view/{token}` → click media | No reaction bar or comment form visible |
| API without token | POST to `/api/reactions` without token | 403 Forbidden |

---

### Guest Wall

At `/event/{token}/wall`, shows contributor avatars (initials) with upload counts.

Only guests with at least one upload appear. Tapping a guest filters the gallery to their uploads.

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Empty wall | New event, no uploads | "No uploads yet" message |
| Contributors | Two guests upload photos | Both appear with correct counts |
| Tap guest | Click a guest avatar | Gallery opens filtered to that guest's uploads |
| Zero-upload guest | Guest enters name but doesn't upload | Does not appear on wall |

---

### Admin Dashboard

At `/admin/{adminToken}`, hosts manage their event.

Features:
- Event overview with media counts (photos, videos, text, audio)
- QR codes and copyable links (guest, view-only, admin)
- **Media grid** — view all uploads with per-item delete
- **Guest list** — all guests with contribution counts
- **Moments manager** — add/delete event moments
- **Prompts manager** — add/toggle/delete photo challenges
- **ZIP export** — download all media files + `metadata.json`

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Valid admin token | Open `/admin/{adminToken}` | Dashboard loads with event stats |
| Invalid admin token | Open `/admin/not-a-real-uuid` | 404 Not Found |
| Delete media | Click delete on a media item → confirm | Removed from gallery, database, and storage |
| Add moment | Type name → Add | Moment appears in list and upload dropdown |
| Delete moment | Delete a moment | Moment removed; associated media unassigned |
| Add prompt | Type challenge text → Add | Prompt appears; guests see it in gallery |
| Toggle prompt | Deactivate a prompt | Hidden from guest gallery |
| Export ZIP | Click Export | ZIP downloads with media files + metadata.json |
| Export error | Export with storage unreachable | User-visible error message shown |

---

### Rate Limiting

IP-based limits protect open endpoints:

| Endpoint | Default Limit | Window |
|---|---|---|
| `POST /api/events` | 10 requests | 1 hour |
| `POST /api/upload/presigned` | 60 requests | 1 minute |
| `POST /api/posts` / `POST /api/media` | 120 requests | 1 minute |

Override via `RATE_LIMIT_*` env vars. Production can use Upstash Redis for distributed limits.

### Redis caching & presence

When `REDIS_URL` (local) or `UPSTASH_REDIS_REST_*` (production) is set, the app caches event lookups, gallery feed slices, moments/prompts lists, and wall contributor counts. TTLs are configurable via `CACHE_TTL_*` env vars (see `.env.local.example`). Without Redis, all reads go directly to PostgreSQL.

- **Guest wall presence:** guests on the wall tab send heartbeats; others appear with an online indicator for `PRESENCE_TTL_SEC` (default 90s).
- **Upload idempotency:** the upload UI sends an `idempotencyKey` so retried `POST /api/posts` or `POST /api/media` after a successful S3 upload do not create duplicate posts (requires Redis).

#### How to Test

| Test | Steps | Expected Result |
|---|---|---|
| Event creation limit | Create 11 events rapidly from same IP | 11th request returns 429 |
| Retry-After header | Trigger rate limit | Response includes `Retry-After` seconds |

---

## 3. Step-by-Step Application Guide

### For Hosts (Event Creators)

#### Step 1: Create Your Event

1. Open the app home page (`/`).
2. If prompted, click **Host login** and enter the platform secret (`HOST_ACCESS_SECRET`).
3. Click **Create an Event**.
4. Fill in:
   - **Event name** (required) — e.g. "Sarah & Tom's Wedding"
   - **Host name** (required) — your name
   - **Event date** (optional) — used for calendar navigation default
   - **Description** (optional)
   - **Access mode** — invite-only, event code, or both
   - **Guest list** (optional) — personal invite codes for households
   - **Event code** (optional) — shared code when mode allows
5. Click **Create Event**.

#### Step 2: Save Your Links

On the success screen you receive three links:

| Link | Who Uses It | Share Via |
|---|---|---|
| **Guest Link** | Guests who will upload photos | QR code, text message, email |
| **View Only Link** | People who should browse but not upload | QR code, social media |
| **Admin Link** | You (the host) only | Bookmark immediately — **shown once only** |

> **Important:** Save your admin link before leaving the success page. It cannot be recovered.

#### Step 3: Share With Guests

- **At the venue:** Display the guest QR code on a sign or screen. Guests scan and upload instantly.
- **Remotely:** Copy the guest link and send via text, email, or group chat.
- **For spectators:** Share the view-only link or QR for people who should browse without uploading.

#### Step 4: Manage Your Event (Admin Dashboard)

1. Open your saved admin link (`/admin/{adminToken}`).
2. Review upload stats and guest contributions.
3. **Curate content:** Delete unwanted or duplicate uploads from the media grid.
4. **Organize moments:** Add custom moments (e.g. "Getting Ready", "Speeches") or remove defaults you don't need.
5. **Create photo prompts:** Add challenges like "Best dance move" or "Candid laughter" to encourage specific uploads.
6. **Export everything:** Click Export to download a ZIP with all media and metadata.

---

### For Guests

#### Step 1: Join the Event

Choose one:
- **Enter your personal invite code** on the home page and pick your name from the list.
- **Enter the event code** and your name on the home page (when the host enabled event-code access).
- **Scan the QR code** displayed at the venue.
- **Open the guest link** shared by the host (redirects through login if needed).

You land on the **Gallery** with bottom navigation: **Gallery · Upload · Guests**.

If you arrived without logging in first, a name prompt may appear. Click **Not you?** to sign out and return home.

#### Step 2: Upload Memories

Tap **Upload** in the bottom navigation.

- **Photos & Videos:** Drag files onto the drop zone or tap to browse. Add an optional caption and select a moment.
- **Text:** Switch to the Text tab, write your memory, and submit.
- **Audio:** Switch to the Audio tab, tap Record, speak your message, and submit.

#### Step 3: Browse & Engage

Tap **Gallery** to see all uploads grouped by day.

- Tap any photo or video to open the lightbox viewer.
- React with emojis or leave a comment.
- Use the calendar strip to jump to a specific day.
- Filter by moment or view a specific guest's uploads.

#### Step 4: See Who's Contributing

Tap **Guests** in the bottom navigation to see the guest wall. Tap any contributor to view their uploads.

---

### For View-Only Visitors

1. Open the view-only link (`/view/{viewToken}`) or enter the view code on the home page.
2. Browse the gallery timeline — no name prompt, no upload, no reactions or comments.
3. Use calendar navigation and moment filters to explore.

---

### For Developers (Local Testing)

See [Section 4](#4-local-development-setup) below for environment setup, then follow this end-to-end test flow:

1. **Bootstrap:** `make setup` (or `make docker:up` + `make app:dev` if already set up)
2. **Set `HOST_ACCESS_SECRET`** in `.env.local`, restart dev server if running
3. **Host login** at `/host/login`, then **create an event** at `/create`
4. **Save all three tokens** from the success screen
5. **Guest login** via invite code or event code on home → upload a test photo
6. **Verify gallery** → post appears in timeline
7. **Add a reaction and comment** on the post
8. **Open view-only link** → confirm no upload or engagement UI
9. **Open admin link** → delete the test post → export ZIP
10. **Run tests:** `make app:test`
11. **Check MinIO console** at `http://localhost:9001` (minioadmin / minioadmin)
12. **Optional LAN test:** `make share:local` and open the printed URL on a phone

---

## 4. Local Development Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm

### First-Time Setup

```bash
git clone <repo-url>
cd photo-album
make setup      # env file + npm install + docker:up + db:migrate
make app:dev    # http://localhost:3000
```

Edit `.env.local` after setup — at minimum set `HOST_ACCESS_SECRET` before creating events.

### Daily Commands

Run `make` or `make help` for the full list. Common tasks:

| Command | Purpose |
|---------|---------|
| `make docker:up` | Start Postgres + MinIO |
| `make app:dev` | Next.js dev server |
| `make app:test` | Vitest unit tests |
| `make app:lint` | ESLint |
| `make db:migrate` | Apply Prisma migrations |
| `make db:studio` | Visual database browser |
| `make docker:down` | Stop containers |
| `make docker:reset` | Wipe DB + storage volumes |
| `make docker:full` | Run entire stack in Docker |
| `make share:local` | Full stack + LAN URL for phone testing |

### Alternative: raw npm / docker commands

```bash
cp .env.local.example .env.local
npm install
docker compose up -d
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

### Services

| Service | URL | Credentials |
|---|---|---|
| Next.js app | http://localhost:3000 | — |
| PostgreSQL | localhost:5432 | postgres / postgres |
| MinIO API | http://localhost:9000 | minioadmin / minioadmin |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

### Environment Variables

See `.env.local.example` for all options. Key variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/photoalbum
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=photo-album
S3_PUBLIC_URL=http://localhost:9000/photo-album
ADMIN_BCRYPT_ROUNDS=12
HOST_ACCESS_SECRET=your-local-host-secret
SESSION_SECRET=dev-insecure-session-secret
```

### Related Docs

See [AGENTS.md](../AGENTS.md) for agent conventions and the complete Makefile reference.

---

## 5. Quick Reference

### URL Routes

| Route | Description |
|---|---|
| `/` | Home — invite login, event code, host login, create event |
| `/host/login` | Platform host login |
| `/create` | Event creation form (host-gated) |
| `/event/{accessToken}` | Guest gallery (upload + engagement) |
| `/event/{accessToken}/upload` | Upload page (photos, text, audio) |
| `/event/{accessToken}/wall` | Guest contribution wall |
| `/view/{viewToken}` | View-only gallery |
| `/admin/{adminToken}` | Host admin dashboard |
| `/admin/{adminToken}/guests` | Manage invite list and joined guests |

### API Endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/events` | Host access cookie | Create event |
| POST | `/api/auth/lookup` | — | Invite code → `{ invitations[] }` (event name/date, members); multiple rows when code is reused across events |
| POST | `/api/auth/login` | — | `invitationId` + guest name → session |
| POST | `/api/auth/event-code` | — | Event code + name → session |
| GET | `/api/events/lookup?code=` | — | Resolve token type |
| GET | `/api/events/{token}/media` | Token in URL | List posts (with nested media) |
| POST | `/api/upload/presigned` | Access token | Get presigned upload URL |
| POST | `/api/posts` | Access token in body | Record multi-item upload |
| POST | `/api/media` | Access token in body | Record text/audio (single item) |
| DELETE | `/api/posts/{id}` | Admin token header | Delete post + storage |
| POST | `/api/reactions` | Access token in body | Toggle emoji reaction |
| GET/POST | `/api/comments` | Access token in body (POST) | List/create comments |
| POST | `/api/guests` | Access token in body | Register guest name |
| GET | `/api/admin/{adminToken}/export` | Admin token in URL | Download ZIP export |

### Data Models

| Model | Description |
|---|---|
| `Event` | Core event with tokens, access mode, event code, host |
| `Invitation` / `InvitationMember` | Personal invite codes and household members |
| `Post` | Gallery item (caption, uploader, moment/prompt); owns reactions & comments |
| `Media` | Photo/video/text/audio files belonging to a post |
| `EventMoment` | Timeline segments (Ceremony, Reception, etc.) |
| `EventPrompt` | Photo challenges guests can respond to |
| `Reaction` | Emoji reactions on posts (unique per guest + emoji) |
| `Comment` | Text comments on posts |
| `Guest` | Registered guest names per event |

### Related Documentation

- [docs/plan.md](plan.md) — Full specification, schema, and implementation phases
- [docs/qa-remediation.md](qa-remediation.md) — QA fixes and verification status
- [AGENTS.md](../AGENTS.md) — Agent/developer conventions for this repo
