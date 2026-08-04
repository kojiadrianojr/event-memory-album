# QA Remediation Plan

Tracking document for fixes identified in the QA review (June 2026). Each phase is independently deployable.

## Status Overview

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | API authorization + objectKey validation | **Complete** |
| 2 | View-only UX enforcement | **Complete** |
| 3 | Admin token lookup performance | **Complete** (self-healing backfill) |
| 4 | Rate limiting | **Complete** |
| 5 | UX polish & docs sync | **Complete** |
| 6 | Mobile lightweight cleanup + remaining hardening | **Complete** |

---

## Phase 1 — API Authorization (P0)

**Goal:** All guest write endpoints require a valid 8-char access token tied to the target event.

### Changes

1. **`lib/validations.ts`**
   - Add shared `accessTokenSchema` (`z.string().length(8)`).
   - Add `token` field to `recordMediaSchema`, `guestNameSchema`, `reactionSchema`, `commentSchema`.
   - Validate `objectKey` starts with `events/{eventId}/` in `recordMediaSchema`.

2. **`lib/event-auth.ts`**
   - Add `verifyAccessTokenForEvent(token, eventId)`.
   - Add `verifyAccessTokenForMedia(token, mediaId)`.

3. **API routes**
   - `POST /api/media` — reject if token invalid or objectKey prefix mismatch.
   - `POST /api/guests` — reject if token does not match `eventId`.
   - `POST /api/reactions` — reject if token does not match media's event.
   - `POST /api/comments` — reject if token does not match media's event.

4. **Client callers**
   - `UploadClient`, `GuestNamePrompt`, `MediaCard`, `ReactionBar`, `CommentPanel` — pass `token` in request body.

### Verification

```bash
# Should return 401/403 without token
curl -X POST /api/media -d '{"type":"TEXT",...}' 

# Should return 400 for wrong objectKey prefix
curl -X POST /api/media -d '{"objectKey":"events/other/...",...}'
```

---

## Phase 2 — View-Only Enforcement (P0)

**Goal:** View-only gallery is read-only in UI and cannot mutate via API.

### Changes

1. **`GalleryClient`** — skip `GuestNamePrompt` when `readOnly`; load media immediately.
2. **`MediaCard`** — accept `readOnly` prop; hide reaction bar and comment form.
3. **API** — view tokens already rejected on presigned upload; Phase 1 token requirement blocks TEXT/reaction/comment spam via view token.

---

## Phase 3 — Admin Token Lookup (P1)

**Goal:** Avoid O(n) bcrypt scan across all events on every admin request.

### Planned changes

1. Add `adminTokenLookup` column (SHA-256 of plain admin token, indexed).
2. Populate on event creation; use for lookup, then bcrypt verify single row.
3. Self-healing backfill for existing events (see below) — a bulk backfill script isn't
   possible since `adminToken` is only ever stored as a bcrypt hash, not plaintext.

---

## Phase 4 — Rate Limiting (P1)

**Goal:** Prevent abuse of open endpoints.

### Planned changes

1. IP-based limits on `POST /api/events`, `POST /api/upload/presigned`, `POST /api/media`.
2. In-memory store when Redis is unset; Docker Redis via `REDIS_URL` for distributed limits.

### Defaults

| Route | Limit | Window |
|-------|-------|--------|
| `POST /api/events` | 10 | 1 hour |
| `POST /api/upload/presigned` | 60 | 1 minute |
| `POST /api/media` | 120 | 1 minute |

Override via `RATE_LIMIT_CREATE_EVENT`, `RATE_LIMIT_PRESIGNED`, `RATE_LIMIT_RECORD_MEDIA`.

---

## Phase 5 — UX Polish & Documentation (P2)

### Planned changes

- Guest name change ("Not you?" link)
- Home page view-token entry
- Export error feedback
- Guest wall filter (contributors only)
- Video MIME in lightbox
- Sync `docs/plan.md` and `AGENTS.md` with current schema

---

## Change Log

### 2026-07-18 — Phase 6 complete

**Mobile lightweight cleanup**

- Photo uploads now generate a mobile-sized webp thumbnail server-side (`lib/thumbnail.ts`, via `sharp`); feed/grid views (`MediaCard`, `AdminMediaGrid`) load the thumbnail, lightbox still loads full-res. Best-effort — a failed thumbnail falls back to the full image, never blocks the upload.
- `app/api/media/[id]/file/route.ts` gained a `?variant=thumb` switch; `lib/media-url.ts` exposes it via `mediaFileUrl(id, { thumb: true })`.
- Feed/grid `<img>` tags now use `loading="lazy" decoding="async"`.
- Removed orphaned `components/gallery/MediaGrid.tsx` + `TimelineGroup.tsx` (superseded by the `MediaCard` feed layout) and unused create-next-app scaffold SVGs in `public/`.
- Split `UploadClient.tsx` (597 lines) into `MediaUploadTab.tsx`, `TextMemoryTab.tsx`, `VoiceMemoTab.tsx`, `UploadSuccessLinks.tsx` — no behavior change, just readability.

**Remaining hardening from the prior audit**

- `GET /api/comments` now requires the same `token` + `verifyAccessTokenForMedia` check its `POST` already had.
- `app/api/media/[id]/file/route.ts` documented as intentionally unauthenticated (unguessable cuid + already-public bucket; access control lives in the token model, not this proxy).
- `lib/event-auth.ts`'s legacy admin-token bcrypt scan now self-heals: the first successful match for a lookup-less event backfills its `adminTokenLookup`, so the scan set shrinks on its own without a manual migration (the plaintext token needed for a bulk backfill is never stored).
- `app/api/admin/[adminToken]/export/route.ts` now streams the ZIP directly into the HTTP response instead of buffering the whole archive in memory.
- `app/api/events/[token]/media/route.ts` gained opt-in cursor pagination (`?cursor=`, `?limit=`); omitting both keeps the existing plain-array response for current callers.
- Added Vitest (`npm run test`) with unit tests for `lib/tokens.ts`, `lib/rate-limit.ts`, `lib/thumbnail.ts`, and `lib/export-filename.ts`.

---

### 2026-06-21 — Phase 5 complete

**UX polish**

- **Guest name change:** `SwitchGuestButton` ("Not you?") in event header and upload page; clears `localStorage` and re-shows name prompt via `guestNameCleared` event.
- **Home token lookup:** `GET /api/events/lookup?code=` resolves upload vs view-only codes; `TokenInput` uses it with inline error feedback.
- **Export errors:** `AdminExportButton` shows user-visible error messages on failure.
- **Guest wall:** lists only guests with at least one upload, sorted by contribution count.
- **Video MIME:** `lib/mime-from-url.ts` derives MIME type from file extension in `MediaLightbox`.

**Documentation**

- Synced `docs/plan.md` and `AGENTS.md` with current schema, routes, and implemented features.

---

### 2026-06-21 — Phase 4 complete

**Rate limiting**

- Added `lib/rate-limit.ts` with IP-based fixed-window limits and 429 + `Retry-After` responses.
- Applied to `POST /api/events`, `POST /api/upload/presigned`, `POST /api/media`.
- In-memory store when Redis is unset; Docker Redis via `REDIS_URL` when configured.
- Configurable limits via `RATE_LIMIT_*` env vars (see `.env.local.example`).

---

### 2026-06-21 — Phase 1 complete

**API authorization**

- Added `accessTokenSchema` and required `token` field on all guest write schemas (`lib/validations.ts`).
- Added `verifyAccessTokenForEvent` and `verifyAccessTokenForMedia` helpers (`lib/event-auth.ts`).
- Secured routes: `POST /api/media`, `/api/guests`, `/api/reactions`, `/api/comments` — return **403** when token is missing, invalid, or a view-only token.
- Added `objectKey` prefix validation: must start with `events/{eventId}/`.

**Client updates**

- All mutation callers now pass `token`: `UploadClient`, `GuestNamePrompt`, `MediaCard`, `ReactionBar`, `CommentPanel`.

**Verified**

- Unauthenticated media POST → 400 (missing token).
- View token on media POST → 403.
- Wrong objectKey prefix → 400.
- Valid access token → 201.

---

### 2026-06-21 — Phase 2 complete

**View-only enforcement**

- `GalleryClient`: skips `GuestNamePrompt` when `readOnly`; loads gallery immediately.
- `MediaCard`: accepts `readOnly` prop; hides reaction bar and comment form in view-only mode.

---

### 2026-06-21 — Phase 3 complete (code)

**Admin token lookup**

- Added optional `adminTokenLookup` column on `Event` (SHA-256 of plain admin token, indexed).
- New events store lookup at creation (`app/api/events/route.ts`).
- `findEventByAdminToken` and admin page use indexed lookup first; fall back to legacy bcrypt scan for events without lookup.
- Legacy scan now self-heals: the first successful bcrypt match for a lookup-less event writes its `adminTokenLookup`, so that event takes the fast path on every subsequent request and the legacy scan set shrinks on its own.
- Migration: `prisma/migrations/20260621000000_add_admin_token_lookup/migration.sql`.

**To apply locally:**

```bash
npx prisma migrate dev
# or: npx prisma db push
```

---

### 2026-06-21 — Phase 1 started

- Created this remediation plan.
