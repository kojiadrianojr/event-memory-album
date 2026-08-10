import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidatePostCaches } from "@/lib/cache-invalidate";
import { verifyAccessTokenForEvent } from "@/lib/event-auth";
import { withIdempotency } from "@/lib/idempotency";
import {
  mediaUrlForType,
  photoMetadataForType,
  postInclude,
} from "@/lib/post-helpers";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { recordMediaSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.recordMedia);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = recordMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    token,
    objectKey,
    type,
    caption,
    uploaderName,
    eventId,
    momentId,
    promptId,
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
        return { status: 404, body: { error: "Event not found" } };
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

      const url = mediaUrlForType(type, objectKey);
      const photoMeta =
        type === "PHOTO" ? await photoMetadataForType(type, objectKey) : null;

      const [post] = await db.$transaction([
        db.post.create({
          data: {
            eventId,
            caption: caption?.trim() || null,
            uploaderName,
            momentId: momentId ?? null,
            promptId: promptId ?? null,
            media: {
              create: {
                eventId,
                url,
                thumbnailUrl: photoMeta?.thumbnailUrl ?? null,
                largeUrl: photoMeta?.largeUrl ?? null,
                width: photoMeta?.width ?? null,
                height: photoMeta?.height ?? null,
                type,
                sortOrder: 0,
              },
            },
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
