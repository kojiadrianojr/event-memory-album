import { describe, expect, it } from "vitest";
import type { Comment, PostItem, Reaction } from "@/components/gallery/types";
import {
  createPendingLocalWrites,
  prunePendingWrites,
  reconcileFeedPosts,
} from "@/lib/merge-feed-posts";

function makePost(id: string, uploadedAt: string): PostItem {
  return {
    id,
    eventId: "evt-1",
    caption: null,
    uploaderName: "Guest",
    takenAt: null,
    uploadedAt,
    momentId: null,
    promptId: null,
    moment: null,
    prompt: null,
    media: [],
    reactions: [],
    comments: [],
  };
}

function makeComment(
  id: string,
  postId: string,
  content: string,
  createdAt = "2026-01-01T10:00:00Z"
): Comment {
  return { id, postId, content, authorName: "Bea", createdAt };
}

function makeReaction(id: string, postId: string, emoji: string): Reaction {
  return {
    id,
    postId,
    emoji,
    guestName: "Bea",
    createdAt: "2026-01-01T10:00:00Z",
  };
}

/** Deep-clones a post so a "server" copy never shares references with state. */
function serverCopy(post: PostItem): PostItem {
  return JSON.parse(JSON.stringify(post)) as PostItem;
}

describe("reconcileFeedPosts — ordering and new posts", () => {
  it("returns existing unchanged when incoming is empty", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const result = reconcileFeedPosts(existing, []);
    expect(result.merged).toBe(existing);
    expect(result.newPosts).toEqual([]);
  });

  it("appends new posts and preserves descending uploadedAt order", () => {
    const existing = [
      makePost("d", "2026-01-01T13:00:00Z"),
      makePost("c", "2026-01-01T12:00:00Z"),
    ];
    const incoming = [
      makePost("b", "2026-01-01T11:00:00Z"),
      makePost("a", "2026-01-01T10:00:00Z"),
    ];
    const { merged, newPosts } = reconcileFeedPosts(existing, incoming);
    expect(newPosts).toHaveLength(2);
    expect(merged.map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("does not duplicate posts already in the feed", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const incoming = [
      makePost("a", "2026-01-01T10:00:00Z"),
      makePost("b", "2026-01-01T11:00:00Z"),
    ];
    const { merged, newPosts } = reconcileFeedPosts(existing, incoming);
    expect(newPosts.map((p) => p.id)).toEqual(["b"]);
    expect(merged.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("sorts out-of-order incoming posts by uploadedAt then id", () => {
    const existing = [makePost("d", "2026-01-01T13:00:00Z")];
    const incoming = [
      makePost("b", "2026-01-01T11:00:00Z"),
      makePost("c", "2026-01-01T12:00:00Z"),
    ];
    const { merged } = reconcileFeedPosts(existing, incoming);
    expect(merged.map((p) => p.id)).toEqual(["d", "c", "b"]);
  });

  it("uses id as tiebreaker for identical uploadedAt", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const incoming = [
      makePost("c", "2026-01-01T10:00:00Z"),
      makePost("b", "2026-01-01T10:00:00Z"),
    ];
    const { merged } = reconcileFeedPosts(existing, incoming);
    expect(merged.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("leaves posts absent from the response untouched", () => {
    const stale = makePost("a", "2026-01-01T10:00:00Z");
    const existing = [makePost("b", "2026-01-01T11:00:00Z"), stale];
    const { merged } = reconcileFeedPosts(existing, [
      serverCopy(existing[0]),
    ]);
    expect(merged.find((p) => p.id === "a")).toBe(stale);
  });
});

describe("reconcileFeedPosts — updates to posts already on screen", () => {
  it("surfaces a comment another guest added", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const server = serverCopy(existing[0]);
    server.comments = [makeComment("c1", "a", "nice shot")];

    const { merged, newPosts } = reconcileFeedPosts(existing, [server]);
    expect(newPosts).toEqual([]);
    expect(merged[0].comments.map((c) => c.content)).toEqual(["nice shot"]);
  });

  it("drops a comment another guest deleted", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].comments = [makeComment("c1", "a", "nice shot")];
    const server = serverCopy(existing[0]);
    server.comments = [];

    const { merged } = reconcileFeedPosts(existing, [server]);
    expect(merged[0].comments).toEqual([]);
  });

  it("shows a comment another guest edited", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].comments = [makeComment("c1", "a", "nice shot")];
    const server = serverCopy(existing[0]);
    server.comments = [makeComment("c1", "a", "great shot")];

    const { merged } = reconcileFeedPosts(existing, [server]);
    expect(merged[0].comments[0].content).toBe("great shot");
  });

  it("updates reactions on an existing post", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const server = serverCopy(existing[0]);
    server.reactions = [makeReaction("r1", "a", "❤️")];

    const { merged } = reconcileFeedPosts(existing, [server]);
    expect(merged[0].reactions.map((r) => r.emoji)).toEqual(["❤️"]);
  });

  it("propagates a caption and moment edit", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const server = serverCopy(existing[0]);
    server.caption = "First dance";
    server.momentId = "m1";
    server.moment = { id: "m1", name: "Reception", sortOrder: 1 };

    const { merged } = reconcileFeedPosts(existing, [server]);
    expect(merged[0].caption).toBe("First dance");
    expect(merged[0].moment?.name).toBe("Reception");
  });
});

describe("reconcileFeedPosts — object identity", () => {
  it("returns the same array when nothing changed", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const { merged } = reconcileFeedPosts(existing, [serverCopy(existing[0])]);
    expect(merged).toBe(existing);
  });

  it("keeps identity for unchanged posts while updating changed ones", () => {
    const existing = [
      makePost("b", "2026-01-01T11:00:00Z"),
      makePost("a", "2026-01-01T10:00:00Z"),
    ];
    const unchanged = serverCopy(existing[0]);
    const changed = serverCopy(existing[1]);
    changed.comments = [makeComment("c1", "a", "hello")];

    const { merged } = reconcileFeedPosts(existing, [unchanged, changed]);
    expect(merged[0]).toBe(existing[0]);
    expect(merged[1]).not.toBe(existing[1]);
  });
});

describe("reconcileFeedPosts — pending local writes", () => {
  it("keeps a locally added comment the server has not echoed yet", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].comments = [
      makeComment("local-1", "a", "mine", "2026-01-01T10:05:00Z"),
    ];
    const server = serverCopy(existing[0]);
    server.comments = [makeComment("c1", "a", "theirs", "2026-01-01T10:01:00Z")];

    const pending = createPendingLocalWrites();
    pending.commentIds.add("local-1");

    const { merged } = reconcileFeedPosts(existing, [server], { pending });
    expect(merged[0].comments.map((c) => c.content)).toEqual([
      "theirs",
      "mine",
    ]);
  });

  it("does not resurrect a remotely deleted comment that is not pending", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].comments = [makeComment("c1", "a", "gone")];
    const server = serverCopy(existing[0]);
    server.comments = [];

    const pending = createPendingLocalWrites();
    pending.commentIds.add("some-other-id");

    const { merged } = reconcileFeedPosts(existing, [server], { pending });
    expect(merged[0].comments).toEqual([]);
  });

  it("keeps local reactions when the request left before the local write", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].reactions = [makeReaction("local-r", "a", "🎉")];
    const server = serverCopy(existing[0]);
    server.reactions = [];

    const pending = createPendingLocalWrites();
    pending.lastWriteAt.set("a", 2_000);

    const { merged } = reconcileFeedPosts(existing, [server], {
      fetchStartedAt: 1_000,
      pending,
    });
    expect(merged[0].reactions.map((r) => r.emoji)).toEqual(["🎉"]);
    expect(merged).toBe(existing);
  });

  it("accepts server reactions when the request left after the local write", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    existing[0].reactions = [makeReaction("local-r", "a", "🎉")];
    const server = serverCopy(existing[0]);
    server.reactions = [];

    const pending = createPendingLocalWrites();
    pending.lastWriteAt.set("a", 1_000);

    const { merged } = reconcileFeedPosts(existing, [server], {
      fetchStartedAt: 2_000,
      pending,
    });
    expect(merged[0].reactions).toEqual([]);
  });
});

describe("prunePendingWrites", () => {
  it("clears comment ids the server has confirmed", () => {
    const pending = createPendingLocalWrites();
    pending.commentIds.add("c1");
    pending.commentIds.add("still-pending");

    const post = makePost("a", "2026-01-01T10:00:00Z");
    post.comments = [makeComment("c1", "a", "echoed")];

    prunePendingWrites(pending, [post], 1_000);
    expect(pending.commentIds.has("c1")).toBe(false);
    expect(pending.commentIds.has("still-pending")).toBe(true);
  });

  it("clears reaction markers older than the fetch, keeping newer ones", () => {
    const pending = createPendingLocalWrites();
    pending.lastWriteAt.set("a", 500);
    pending.lastWriteAt.set("b", 2_000);

    const posts = [
      makePost("a", "2026-01-01T10:00:00Z"),
      makePost("b", "2026-01-01T11:00:00Z"),
    ];

    prunePendingWrites(pending, posts, 1_000);
    expect(pending.lastWriteAt.has("a")).toBe(false);
    expect(pending.lastWriteAt.get("b")).toBe(2_000);
  });
});
