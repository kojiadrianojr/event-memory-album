import type { Media, Post } from "@prisma/client";
import { db } from "@/lib/db";
import { invalidatePostCaches } from "@/lib/cache-invalidate";
import { deleteObject, getObjectBuffer, getPublicUrl, objectKeyFromPublicUrl, putObject } from "@/lib/s3";
import {
  createThumbnail,
  getImageDimensions,
  thumbnailObjectKey,
} from "@/lib/thumbnail";

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

export interface PhotoMetadata {
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Best-effort thumbnail + dimension extraction for photo uploads. Never throws —
 * a failed thumbnail just means the full-size image is served everywhere.
 */
export async function photoMetadataForType(
  type: "PHOTO" | "VIDEO" | "TEXT" | "AUDIO",
  objectKey?: string | null
): Promise<PhotoMetadata> {
  if (type !== "PHOTO" || !objectKey) {
    return { thumbnailUrl: null, width: null, height: null };
  }

  try {
    const original = await getObjectBuffer(objectKey);
    const dimensions = await getImageDimensions(original);
    const thumbnail = await createThumbnail(original);
    const thumbKey = thumbnailObjectKey(objectKey);
    await putObject(thumbKey, thumbnail, "image/webp");
    return {
      thumbnailUrl: getPublicUrl(thumbKey),
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    };
  } catch {
    return { thumbnailUrl: null, width: null, height: null };
  }
}

/** @deprecated Use photoMetadataForType */
export async function tryCreateThumbnailUrl(
  objectKey: string
): Promise<string | null> {
  const meta = await photoMetadataForType("PHOTO", objectKey);
  return meta.thumbnailUrl;
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
  const meta = await photoMetadataForType(type, objectKey);
  return meta.thumbnailUrl;
}
