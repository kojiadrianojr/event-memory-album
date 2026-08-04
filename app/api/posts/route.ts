import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidatePostCaches } from "@/lib/cache-invalidate";
import { verifyAccessTokenForEvent } from "@/lib/event-auth";
import { withIdempotency } from "@/lib/idempotency";
import {
  earliestTakenAt,
  mediaUrlForType,
  postInclude,
  thumbnailUrlForType,
} from "@/lib/post-helpers";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { createPostSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.recordMedia);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    token,
    eventId,
    uploaderName,
    caption,
    momentId,
    promptId,
    items,
    idempotencyKey,
  } = parsed.data;

  const authorized = await verifyAccessTokenForEvent(token, eventId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { status, body: responseBody, replayed } = await withIdempotency(
    eventId,
    idempotencyKey,
    async (): Promise<{ status: number; body: unknown }> => {
      const event = await db.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return {
          status: 404,
          body: { error: "Event not found" },
        };
      }

      if (momentId) {
        const moment = await db.eventMoment.findFirst({
          where: { id: momentId, eventId },
        });
        if (!moment) {
          return { status: 400, body: { error: "Moment not found" } };
        }
      }

      if (promptId) {
        const prompt = await db.eventPrompt.findFirst({
          where: { id: promptId, eventId, isActive: true },
        });
        if (!prompt) {
          return { status: 400, body: { error: "Prompt not found" } };
        }
      }

      const mediaData = await Promise.all(
        items.map(async (item, index) => ({
          eventId,
          type: item.type,
          url: mediaUrlForType(item.type, item.objectKey),
          thumbnailUrl: item.thumbnailObjectKey
            ? mediaUrlForType("PHOTO", item.thumbnailObjectKey)
            : await thumbnailUrlForType(item.type, item.objectKey),
          sortOrder: index,
        }))
      );

      const takenAt = earliestTakenAt(items.map((i) => i.takenAt));

      const [post] = await db.$transaction([
        db.post.create({
          data: {
            eventId,
            caption: caption?.trim() || null,
            uploaderName,
            takenAt,
            momentId: momentId ?? null,
            promptId: promptId ?? null,
            media: { create: mediaData },
          },
          include: postInclude,
        }),
        db.guest.upsert({
          where: { eventId_name: { eventId, name: uploaderName } },
          create: { eventId, name: uploaderName },
          update: {},
        }),
      ]);

      return { status: 201, body: post };
    }
  );

  if (!replayed && status >= 200 && status < 300) {
    await invalidatePostCaches(eventId);
  }

  return NextResponse.json(responseBody, { status });
}
