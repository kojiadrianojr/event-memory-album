import { db } from "@/lib/db";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, eventTokenKey } from "@/lib/cache-keys";
import { verifyAdminToken, hashAdminTokenLookup } from "@/lib/tokens";

const EVENT_SELECT = {
  id: true,
  accessToken: true,
  viewToken: true,
  accessMode: true,
  name: true,
  eventDate: true,
  eventCode: true,
} as const;

export type CachedEvent = {
  id: string;
  accessToken: string;
  viewToken: string;
  accessMode: "INVITE_ONLY" | "EVENT_CODE" | "BOTH";
  name: string;
  eventDate: Date | null;
  eventCode: string | null;
};

function toCachedEvent(
  event: {
    id: string;
    accessToken: string;
    viewToken: string;
    accessMode: "INVITE_ONLY" | "EVENT_CODE" | "BOTH";
    name: string;
    eventDate: Date | null;
    eventCode: string | null;
  } | null
): CachedEvent | null {
  return event;
}

export async function findEventByAccessToken(
  token: string
): Promise<CachedEvent | null> {
  return cachedJson(eventTokenKey(token), CACHE_TTL.event, async () =>
    toCachedEvent(
      await db.event.findUnique({
        where: { accessToken: token },
        select: EVENT_SELECT,
      })
    )
  );
}

export async function findEventByViewToken(
  token: string
): Promise<CachedEvent | null> {
  return cachedJson(eventTokenKey(token), CACHE_TTL.event, async () =>
    toCachedEvent(
      await db.event.findUnique({
        where: { viewToken: token },
        select: EVENT_SELECT,
      })
    )
  );
}

export async function findEventByGuestOrViewToken(
  token: string
): Promise<CachedEvent | null> {
  return cachedJson(eventTokenKey(token), CACHE_TTL.event, async () =>
    toCachedEvent(
      await db.event.findFirst({
        where: { OR: [{ accessToken: token }, { viewToken: token }] },
        select: EVENT_SELECT,
      })
    )
  );
}

export async function verifyAccessTokenForEvent(
  token: string,
  eventId: string
): Promise<boolean> {
  const event = await findEventByAccessToken(token);
  return event?.id === eventId;
}

export async function verifyAccessTokenForPost(
  token: string,
  postId: string
): Promise<boolean> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { event: { select: { accessToken: true } } },
  });
  if (!post) return false;
  return post.event.accessToken === token;
}

/** @deprecated Use verifyAccessTokenForPost — kept for file proxy lookups */
export async function verifyAccessTokenForMedia(
  token: string,
  mediaId: string
): Promise<boolean> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { event: { select: { accessToken: true } } },
  });
  if (!media) return false;
  return media.event.accessToken === token;
}

export async function verifyAdminForEvent(
  adminToken: string,
  eventId: string
): Promise<boolean> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { adminToken: true },
  });
  if (!event) return false;
  return verifyAdminToken(adminToken, event.adminToken);
}

export async function getPostForGuestMutation(
  postId: string,
  uploaderName: string
) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { media: true },
  });
  if (!post) return { error: "not_found" as const };
  if (post.uploaderName !== uploaderName) return { error: "forbidden" as const };
  return { post };
}

export async function getCommentForGuestMutation(
  commentId: string,
  authorName: string
) {
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) return { error: "not_found" as const };
  if (comment.authorName !== authorName) return { error: "forbidden" as const };
  return { comment };
}

export async function findEventByAdminToken(adminToken: string) {
  const lookup = hashAdminTokenLookup(adminToken);
  const byLookup = await db.event.findUnique({
    where: { adminTokenLookup: lookup },
  });
  if (byLookup) {
    const valid = await verifyAdminToken(adminToken, byLookup.adminToken);
    if (valid) return byLookup;
  }

  // Legacy events created before adminTokenLookup existed. adminToken is only ever
  // stored as a bcrypt hash, so this column can't be backfilled in bulk — instead,
  // self-heal it here the moment a legacy token is successfully verified. Each event
  // takes the indexed fast path on every request after its first post-cleanup login,
  // so this scan shrinks over time and never needs a manual migration step.
  const events = await db.event.findMany({
    where: { adminTokenLookup: null },
    select: { id: true, adminToken: true },
  });
  for (const event of events) {
    if (await verifyAdminToken(adminToken, event.adminToken)) {
      return db.event.update({
        where: { id: event.id },
        data: { adminTokenLookup: lookup },
      });
    }
  }
  return null;
}
