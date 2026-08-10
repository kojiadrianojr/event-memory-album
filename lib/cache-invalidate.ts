import { cacheDel, cacheIncr } from "@/lib/cache";
import {
  feedVersionKey,
  lookupInviteKey,
  mediaFileKey,
  momentsKey,
  promptsKey,
  wallKey,
} from "@/lib/cache-keys";

export async function invalidateFeed(eventId: string): Promise<void> {
  await cacheIncr(feedVersionKey(eventId));
}

export async function invalidateWall(eventId: string): Promise<void> {
  await cacheDel(wallKey(eventId));
}

export async function invalidateInviteLookup(code: string): Promise<void> {
  await cacheDel(lookupInviteKey(code.trim().toUpperCase()));
}

export async function invalidateMomentsPrompts(eventId: string): Promise<void> {
  await cacheDel(momentsKey(eventId), promptsKey(eventId));
}

/** Bump feed version and clear wall cache after post mutations. */
export async function invalidatePostCaches(eventId: string): Promise<void> {
  await Promise.all([invalidateFeed(eventId), invalidateWall(eventId)]);
}

export async function invalidateMediaFileCache(mediaId: string): Promise<void> {
  await cacheDel(mediaFileKey(mediaId));
}
