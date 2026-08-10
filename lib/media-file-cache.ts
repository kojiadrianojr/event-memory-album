import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, mediaFileKey } from "@/lib/cache-keys";
import { invalidateMediaFileCache } from "@/lib/cache-invalidate";
import {
  getObjectBuffer,
  getPublicUrl,
  objectKeyFromPublicUrl,
  putObject,
} from "@/lib/s3";
import {
  createLargeVariant,
  largeObjectKey,
} from "@/lib/thumbnail";

export interface MediaFileRecord {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  largeUrl: string | null;
  type: "PHOTO" | "VIDEO" | "AUDIO" | "TEXT";
}

const mediaFileSelect = {
  id: true,
  url: true,
  thumbnailUrl: true,
  largeUrl: true,
  type: true,
} as const;

export async function getMediaForFileRoute(
  id: string
): Promise<MediaFileRecord | null> {
  const cached = await cacheGet<MediaFileRecord>(mediaFileKey(id));
  if (cached) return cached;

  const media = await db.media.findUnique({
    where: { id },
    select: mediaFileSelect,
  });
  if (!media) return null;

  await cacheSet(mediaFileKey(id), media, CACHE_TTL.mediaFile);
  return media;
}

/** Best-effort lazy backfill for photos uploaded before large variants existed. */
export async function ensureLargeVariant(
  media: MediaFileRecord
): Promise<MediaFileRecord> {
  if (media.type !== "PHOTO" || media.largeUrl || !media.url) {
    return media;
  }

  const objectKey = objectKeyFromPublicUrl(media.url);
  if (!objectKey) return media;

  try {
    const original = await getObjectBuffer(objectKey);
    const large = await createLargeVariant(original);
    const largeKey = largeObjectKey(objectKey);
    await putObject(largeKey, large, "image/webp");
    const largeUrl = getPublicUrl(largeKey);

    await db.media.update({
      where: { id: media.id },
      data: { largeUrl },
    });
    await invalidateMediaFileCache(media.id);

    return { ...media, largeUrl };
  } catch {
    return media;
  }
}

export type MediaFileVariant = "thumb" | "large" | "original";

export function resolveMediaSourceUrl(
  media: MediaFileRecord,
  variant: MediaFileVariant
): string | null {
  if (variant === "thumb") {
    return media.thumbnailUrl ?? media.url;
  }
  if (variant === "large") {
    return media.largeUrl ?? media.url;
  }
  return media.url;
}
