import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cachedJson, cacheGetVersion } from "@/lib/cache";
import {
  CACHE_TTL,
  feedCacheKey,
  feedVersionKey,
} from "@/lib/cache-keys";
import { findEventByGuestOrViewToken } from "@/lib/event-auth";
import { postInclude } from "@/lib/post-helpers";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const momentId = searchParams.get("momentId");
  const cursor = searchParams.get("cursor");
  const limit = parsePositiveInt(searchParams.get("limit"));

  const event = await findEventByGuestOrViewToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const version = await cacheGetVersion(feedVersionKey(event.id));
  const cacheKey = feedCacheKey(
    event.id,
    version,
    momentId,
    cursor,
    limit
  );

  const result = await cachedJson(cacheKey, CACHE_TTL.feed, async () => {
    const posts = await db.post.findMany({
      where: {
        eventId: event.id,
        ...(momentId ? { momentId } : {}),
      },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      include: postInclude,
      ...(limit
        ? {
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          }
        : {}),
    });

    if (!limit) {
      return { shape: "array" as const, posts };
    }

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { shape: "page" as const, items, nextCursor };
  });

  if (result.shape === "array") {
    return NextResponse.json(result.posts);
  }

  return NextResponse.json({
    items: result.items,
    nextCursor: result.nextCursor,
  });
}
