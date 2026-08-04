import type { Media, Post } from "@prisma/client";
import { db } from "@/lib/db";
import { invalidatePostCaches } from "@/lib/cache-invalidate";
import { deleteObject, getObjectBuffer, getPublicUrl, objectKeyFromPublicUrl, putObject } from "@/lib/s3";
import { createThumbnail, thumbnailObjectKey } from "@/lib/thumbnail";

export async function deletePostAndStorage(
  post: Post & { media: Media[] }
): Promise<void> {
  await db.post.delete({ where: { id: post.id } });
  await invalidatePostCaches(post.eventId);

  for (const item of post.media) {
    if (!item.url) continue;
    try {
      const objectKey = objectKeyFromPublicUrl(item.url);
      if (objectKey) await deleteObject(objectKey);
    } catch {
      // Non-fatal: DB record is already removed
    }
  }
}

/**
 * Best-effort thumbnail generation for photo uploads. Never throws — a failed
 * thumbnail just means the full-size image is served everywhere.
 */
export async function tryCreateThumbnailUrl(
  objectKey: string
): Promise<string | null> {
  try {
    const original = await getObjectBuffer(objectKey);
    const thumbnail = await createThumbnail(original);
    const thumbKey = thumbnailObjectKey(objectKey);
    await putObject(thumbKey, thumbnail, "image/webp");
    return getPublicUrl(thumbKey);
  } catch {
    return null;
  }
}

export const postInclude = {
  media: { orderBy: { sortOrder: "asc" as const } },
  moment: { select: { id: true, name: true, sortOrder: true } },
  prompt: {
    select: { id: true, text: true, sortOrder: true, isActive: true },
  },
  reactions: true,
  comments: { orderBy: { createdAt: "asc" as const } },
} as const;

export function mediaUrlForType(
  type: "PHOTO" | "VIDEO" | "TEXT" | "AUDIO",
  objectKey?: string | null
): string | null {
  if (type === "TEXT") return null;
  return objectKey ? getPublicUrl(objectKey) : null;
}

export async function thumbnailUrlForType(
  type: "PHOTO" | "VIDEO" | "TEXT" | "AUDIO",
  objectKey?: string | null
): Promise<string | null> {
  if (type !== "PHOTO" || !objectKey) return null;
  return tryCreateThumbnailUrl(objectKey);
}
