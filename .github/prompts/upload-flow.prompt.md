---
description: "Implement or extend the presigned-URL upload flow: API routes, client orchestration, and UI components."
argument-hint: "Describe what to implement or fix (e.g. 'presigned route', 'UploadDropzone', 'POST /api/media')"
agent: "agent"
tools: [search, read_file, create_file, replace_string_in_file]
---

Implement or extend the upload flow for this photo-album app following the three-step presigned-URL pattern:

```
Client → POST /api/upload/presigned → S3 PUT (direct) → POST /api/media
```

## Exact flow to implement

1. **`POST /api/upload/presigned`** (`app/api/upload/presigned/route.ts`)
   - Validate the guest `accessToken` against the DB (reject unknown tokens with 401)
   - Validate `mimeType` is `image/*` or `video/*` only (reject others with 400)
   - Generate an object key: `{eventId}/{nanoid()}.{ext}`
   - Call `lib/s3.ts` presigned PUT helper (15-minute expiry)
   - Return `{ presignedUrl, objectKey }`

2. **`POST /api/media`** (`app/api/media/route.ts`)
   - Accept `{ objectKey, mimeType, caption, uploaderName, token, takenAt? }`
   - Validate inputs via the shared Zod schema in `lib/validations.ts`
   - Derive `url` from `objectKey` using the public bucket base URL
   - Set `type` to `PHOTO` or `VIDEO` based on `mimeType`
   - Leave `thumbnailUrl` as `null` for videos (v1 — no server-side extraction)
   - INSERT into the `Media` table via `lib/db.ts` and return the created record

3. **`GuestNamePrompt`** (`components/ui/GuestNamePrompt.tsx`)
   - Show a modal/overlay on first visit if `localStorage.getItem('guestName')` is absent
   - On submit, store name in `localStorage` and upsert into the `Guest` table via a fetch to `POST /api/guests`

4. **`/event/[token]/upload` page** (`app/event/[token]/upload/page.tsx`)
   - Use `react-dropzone` for multi-file selection (accept `image/*,video/*`)
   - Per-file: show thumbnail preview, caption `<input>`, upload progress bar
   - Orchestrate per file: `POST /api/upload/presigned` → `PUT presignedUrl` with raw file body → `POST /api/media`
   - Show success/error state per file; do not block other files on a single failure

5. **`UploadDropzone` + `UploadProgress`** (`components/upload/`)
   - `UploadDropzone` handles drag-and-drop and file-picker via `react-dropzone`
   - `UploadProgress` renders per-file: filename, thumbnail, caption input, progress %, and status icon

## Conventions to follow

- Use `lib/validations.ts` Zod schemas for **all** API input validation — never write inline schemas
- Use `lib/s3.ts` for S3 operations (never import `@aws-sdk` directly in route handlers)
- Use `lib/db.ts` Prisma singleton (never call `new PrismaClient()` in routes)
- Use `bcryptjs` (not `bcrypt`) — pure JS, no native build
- All API error responses must include `{ error: string }` and an appropriate HTTP status code
- Guest tokens are plaintext 8-char nanoids; admin tokens are bcrypt-hashed UUIDs
- `S3_ENDPOINT` env var drives MinIO vs R2 — never hardcode endpoint URLs

## Files to read for context

- [AGENTS.md](../../AGENTS.md) — project conventions and access-control rules
- [docs/plan.md](../../docs/plan.md) — full upload-flow diagram and Phase 3 spec
- [lib/s3.ts](../../lib/s3.ts) — presigned URL helper API
- [lib/validations.ts](../../lib/validations.ts) — existing Zod schemas
- [prisma/schema.prisma](../../prisma/schema.prisma) — Media and Guest model fields

## Task

$args
