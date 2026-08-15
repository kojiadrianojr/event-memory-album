import type {
  Comment,
  EventMoment,
  EventPrompt,
  MediaAsset,
  PostItem,
  Reaction,
} from "@/components/gallery/types";

/**
 * Local writes that have not yet been echoed back by the server. A poll
 * response that raced one of these must not revert it.
 */
export interface PendingLocalWrites {
  /** Comment ids created locally and not yet seen in a feed response. */
  commentIds: Set<string>;
  /** postId -> timestamp of the last local reaction write on that post. */
  lastWriteAt: Map<string, number>;
}

export interface ReconcileOptions {
  /** When the feed request was issued — used as a happens-before check. */
  fetchStartedAt?: number;
  pending?: PendingLocalWrites;
}

export function createPendingLocalWrites(): PendingLocalWrites {
  return { commentIds: new Set(), lastWriteAt: new Map() };
}

function comparePosts(a: PostItem, b: PostItem): number {
  const timeDiff =
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return b.id.localeCompare(a.id);
}

/** Ascending, matching the server's `postInclude` comment ordering. */
function compareComments(a: Comment, b: Comment): number {
  const timeDiff =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.id.localeCompare(b.id);
}

function sameComments(a: Comment[], b: Comment[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((comment, i) => {
    const other = b[i];
    return (
      comment.id === other.id &&
      comment.content === other.content &&
      comment.authorName === other.authorName &&
      comment.createdAt === other.createdAt
    );
  });
}

function sameReactions(a: Reaction[], b: Reaction[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((reaction, i) => {
    const other = b[i];
    return (
      reaction.id === other.id &&
      reaction.emoji === other.emoji &&
      reaction.guestName === other.guestName
    );
  });
}

function sameMedia(a: MediaAsset[], b: MediaAsset[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((media, i) => {
    const other = b[i];
    return (
      media.id === other.id &&
      media.url === other.url &&
      media.thumbnailUrl === other.thumbnailUrl &&
      media.largeUrl === other.largeUrl &&
      media.width === other.width &&
      media.height === other.height &&
      media.type === other.type &&
      media.sortOrder === other.sortOrder
    );
  });
}

function sameMoment(a: EventMoment | null, b: EventMoment | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.name === b.name && a.sortOrder === b.sortOrder;
}

function samePrompt(a: EventPrompt | null, b: EventPrompt | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.sortOrder === b.sortOrder &&
    a.isActive === b.isActive
  );
}

/**
 * Folds one server row into the copy already on screen. Returns `prev`
 * unchanged when nothing differs, so React can skip re-rendering the card.
 */
function reconcilePost(
  prev: PostItem,
  next: PostItem,
  { fetchStartedAt, pending }: ReconcileOptions
): PostItem {
  // The server list is authoritative — that is what makes edits and deletes by
  // other guests propagate. Only comments this client just created and the
  // server has not echoed yet are added back, so a comment another guest
  // deleted is never resurrected.
  let comments = next.comments;
  if (pending && pending.commentIds.size > 0) {
    const serverIds = new Set(next.comments.map((comment) => comment.id));
    const unconfirmed = prev.comments.filter(
      (comment) =>
        !serverIds.has(comment.id) && pending.commentIds.has(comment.id)
    );
    if (unconfirmed.length > 0) {
      comments = [...next.comments, ...unconfirmed].sort(compareComments);
    }
  }

  // Keep local reactions when the request left before the local write landed.
  const localWriteAt = pending?.lastWriteAt.get(prev.id);
  const racedLocalWrite =
    localWriteAt !== undefined &&
    fetchStartedAt !== undefined &&
    fetchStartedAt < localWriteAt;
  const reactions = racedLocalWrite ? prev.reactions : next.reactions;

  const unchanged =
    prev.caption === next.caption &&
    prev.uploaderName === next.uploaderName &&
    prev.uploadedAt === next.uploadedAt &&
    prev.takenAt === next.takenAt &&
    prev.momentId === next.momentId &&
    prev.promptId === next.promptId &&
    sameMoment(prev.moment, next.moment) &&
    samePrompt(prev.prompt, next.prompt) &&
    sameMedia(prev.media, next.media) &&
    sameComments(prev.comments, comments) &&
    sameReactions(prev.reactions, reactions);

  if (unchanged) return prev;

  return { ...next, comments, reactions };
}

/**
 * Folds a feed response into current state: appends posts not yet on screen
 * and updates the ones that are (comments, reactions, caption, moment).
 *
 * `newPosts` holds only genuinely unseen posts so the caller can stage them
 * behind the "N new posts" banner while updates to visible posts land silently.
 */
export function reconcileFeedPosts(
  existing: PostItem[],
  incoming: PostItem[],
  options: ReconcileOptions = {}
): { merged: PostItem[]; newPosts: PostItem[] } {
  if (incoming.length === 0) {
    return { merged: existing, newPosts: [] };
  }

  const existingIds = new Set(existing.map((post) => post.id));
  const incomingById = new Map(incoming.map((post) => [post.id, post]));

  let updated = false;
  const reconciled = existing.map((prev) => {
    const next = incomingById.get(prev.id);
    if (!next) return prev;
    const result = reconcilePost(prev, next, options);
    if (result !== prev) updated = true;
    return result;
  });

  const newPosts = incoming.filter((post) => !existingIds.has(post.id));

  if (newPosts.length === 0) {
    return { merged: updated ? reconciled : existing, newPosts: [] };
  }

  return {
    merged: [...reconciled, ...newPosts].sort(comparePosts),
    newPosts,
  };
}

/**
 * Records that this client just wrote a reaction on `postId`, so a feed
 * response that was already in flight does not revert it.
 */
export function markLocalReactionWrite(
  pending: PendingLocalWrites,
  postId: string
): void {
  pending.lastWriteAt.set(postId, Date.now());
}

/**
 * Clears local writes the server has now confirmed. Call after each feed
 * response so the pending sets do not grow for the life of the event.
 */
export function prunePendingWrites(
  pending: PendingLocalWrites,
  incoming: PostItem[],
  fetchStartedAt: number
): void {
  for (const post of incoming) {
    for (const comment of post.comments) {
      pending.commentIds.delete(comment.id);
    }

    const writeAt = pending.lastWriteAt.get(post.id);
    if (writeAt !== undefined && fetchStartedAt >= writeAt) {
      pending.lastWriteAt.delete(post.id);
    }
  }
}
