# Cloudflare R2 Setup

Photo Album uses **Cloudflare R2** as production object storage (photos, videos, audio, thumbnails). The app talks to R2 through the S3-compatible API in [`lib/s3.ts`](../lib/s3.ts) — the same code path as local MinIO.

Local development continues to use MinIO (`make docker:up`). R2 replaces that in production (Vercel).

Gallery media is served through the app proxy (`/api/media/[id]/file`), so the bucket can stay **private**. Browser uploads use **presigned PUT URLs**, so **CORS is required**.

---

## 1. Create an R2 bucket

1. Open the [Cloudflare dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2).
2. Enable R2 if prompted (requires a payment method; free tier includes storage).
3. **Create bucket** — name it e.g. `photo-album` (lowercase, no spaces).
4. Leave **Public access** off (recommended). The app reads objects with your API credentials and proxies them to guests.

Copy your **Account ID** from the R2 overview (right sidebar). You need it for `S3_ENDPOINT`.

---

## 2. Create an API token (S3 credentials)

1. On the R2 overview, under **Account details**, click **Manage** next to **API Tokens**.
2. **Create Account API token** (or User API token).
3. Permissions: **Object Read & Write**, scoped to your `photo-album` bucket (or all buckets if you prefer).
4. Create the token and **immediately copy**:
   - **Access Key ID** → `S3_ACCESS_KEY_ID`
   - **Secret Access Key** → `S3_SECRET_ACCESS_KEY`

The secret is shown only once.

---

## 3. Configure CORS (required for uploads)

Guests upload directly from the browser to R2 via presigned URLs. Without CORS, those PUTs fail even when the URL is valid.

1. Open your bucket → **Settings** → **CORS Policy** → **Add CORS policy**.
2. Use the JSON tab and paste (adjust origins to your real domains):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR_VERCEL_DOMAIN.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Save. Propagation can take up to ~30 seconds.

If you later attach a custom domain to the Vercel app, add that origin too.

---

## 4. Environment variables

| Variable | Value |
|----------|-------|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | R2 Access Key ID |
| `S3_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `S3_BUCKET_NAME` | Bucket name (e.g. `photo-album`) |
| `S3_PUBLIC_URL` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>` |
| `R2_ACCOUNT_ID` | Account ID (optional reference; not read by app code) |

Notes:

- `S3_PUBLIC_URL` is the prefix stored on media rows and used to recover object keys on delete. It does **not** need to be publicly reachable when the bucket is private.
- If the bucket uses an EU jurisdiction, use `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` instead.
- Optional public access: enable an R2.dev subdomain or custom domain on the bucket, then set `S3_PUBLIC_URL` to that base (no trailing slash). Not required for this app.

### Production (Vercel)

Set the variables above in **Vercel → Project → Settings → Environment Variables** (Production, and Preview if you want uploads there). Redeploy after changing them.

### Local testing against R2 (optional)

Keep MinIO for day-to-day work. To point a local server at R2 temporarily, swap only the `S3_*` block in `.env.local` and restart `make app:dev`. Restore MinIO values when done.

Example production block (do not commit real secrets):

```bash
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<access-key-id>
S3_SECRET_ACCESS_KEY=<secret-access-key>
S3_BUCKET_NAME=photo-album
S3_PUBLIC_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com/photo-album
R2_ACCOUNT_ID=<ACCOUNT_ID>
```

---

## 5. Verify

1. Deploy or run the app with the R2 env vars set.
2. Create/open an event and upload a photo.
3. Confirm:
   - Presigned upload succeeds (no browser CORS error in DevTools).
   - Photo appears in the gallery.
   - Object exists in the R2 bucket under `events/<eventId>/…`.
   - Admin delete removes the object from R2.

---

## Troubleshooting

### Browser CORS / blocked PUT on upload

- Confirm `AllowedOrigins` matches the page origin **exactly** (scheme + host + port, no path).
- Confirm `AllowedMethods` includes `PUT` and `AllowedHeaders` allows `Content-Type` (or `*`).
- Wait ~30s after saving CORS, then retry.

### `SignatureDoesNotMatch` / `InvalidAccessKeyId`

- Recreate the API token and update both key ID and secret.
- Confirm `S3_ENDPOINT` uses the correct account ID (and jurisdiction suffix if any).

### Upload works, gallery broken

- App reads via server credentials + `/api/media/.../file`. Check Vercel logs for S3 `GetObject` errors.
- Confirm `S3_BUCKET_NAME` matches the bucket that received the upload.

### Delete leaves orphan files in R2

- `S3_PUBLIC_URL` must be the exact prefix used when the object URL was stored (no trailing slash). Changing it later breaks key recovery for old rows.

---

## Related

- Local MinIO: [getting-started.md](./getting-started.md)
- Production database: [supabase-setup.md](./supabase-setup.md)
- Production Redis: [upstash-setup.md](./upstash-setup.md)
- Storage client: [`lib/s3.ts`](../lib/s3.ts)
