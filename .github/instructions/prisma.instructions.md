---
description: "Use when writing Prisma queries, schema changes, database migrations, or any code that touches the database layer. Covers client usage, query patterns, migration workflow, and type-safety conventions for this project."
applyTo: ["prisma/**", "lib/db.ts", "app/api/**/*.ts"]
---

# Prisma Conventions

## Client

- **Always** import the Prisma client from `lib/db.ts` — never instantiate `new PrismaClient()` anywhere else.
- The singleton handles connection reuse across hot-reloads in development.

```ts
// ✅ Correct
import { db } from "@/lib/db";

// ❌ Wrong
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

## Schema

The canonical schema lives in `prisma/schema.prisma`. Models and their key fields:

| Model | Notes |
|-------|-------|
| `Event` | `accessToken` — 8-char nanoid, plaintext. `adminToken` — bcrypt-hashed UUID. |
| `Media` | `type` is `MediaType` enum (`PHOTO` \| `VIDEO`). `thumbnailUrl` is always `null` in v1. |
| `Reaction` | Unique constraint on `(mediaId, guestName, emoji)` — use upsert to toggle. |
| `Comment` | Append-only; no edit/delete in v1. |
| `Guest` | Unique constraint on `(eventId, name)` — always upsert, never plain insert. |

## Migrations

- Create migrations with `npx prisma migrate dev --name <descriptive-name>`.
- After editing `schema.prisma`, always regenerate the client: `npx prisma generate`.
- Never edit migration SQL files by hand after they have been applied.
- Never drop a column and remove it from application code in the same migration — remove the code first.
- The local target database is `postgresql://postgres:postgres@localhost:5432/photoalbum` (Docker Compose container).

## Query Patterns

**Upsert for Guest rows** (unique on `eventId + name`):

```ts
await db.guest.upsert({
  where: { eventId_name: { eventId, name } },
  update: {},
  create: { eventId, name },
});
```

**Toggle Reaction** (unique on `mediaId + guestName + emoji`):

```ts
const existing = await db.reaction.findUnique({
  where: { mediaId_guestName_emoji: { mediaId, guestName, emoji } },
});
if (existing) {
  await db.reaction.delete({ where: { id: existing.id } });
} else {
  await db.reaction.create({ data: { mediaId, guestName, emoji } });
}
```

**Validate event token before any query** — look up the event by `accessToken` in the layout server component; all child routes can trust the event is valid.

```ts
const event = await db.event.findUnique({ where: { accessToken: token } });
if (!event) notFound();
```

**Admin token verification** — the stored value is a bcrypt hash; never compare plaintext:

```ts
import bcrypt from "bcryptjs";
const valid = await bcrypt.compare(rawAdminToken, event.adminToken);
```

## Type Safety

- Use `Prisma.EventGetPayload<...>` / `Prisma.MediaGetPayload<...>` etc. to derive precise return types instead of writing manual interfaces.
- Prefer `select` over `include` when only a subset of fields is needed — avoids over-fetching.
- Do not cast query results with `as any`; fix the type at the query level instead.

## What Not to Do

- Do not use raw SQL (`db.$queryRaw`) unless a query genuinely cannot be expressed with the Prisma query API.
- Do not call `db.$disconnect()` in route handlers — the singleton manages the connection.
- Do not store the plain admin token after creation; it is returned once and never persisted in plaintext.
