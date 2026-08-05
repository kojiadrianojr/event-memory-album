import { describe, expect, it } from "vitest";
import type { PostItem } from "@/components/gallery/types";
import { mergeFeedPosts } from "@/lib/merge-feed-posts";

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

describe("mergeFeedPosts", () => {
  it("returns existing unchanged when incoming is empty", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const result = mergeFeedPosts(existing, []);
    expect(result.merged).toBe(existing);
    expect(result.newCount).toBe(0);
  });

  it("prepends new posts and preserves descending uploadedAt order", () => {
    const existing = [
      makePost("d", "2026-01-01T13:00:00Z"),
      makePost("c", "2026-01-01T12:00:00Z"),
    ];
    const incoming = [
      makePost("b", "2026-01-01T11:00:00Z"),
      makePost("a", "2026-01-01T10:00:00Z"),
    ];
    const { merged, newCount } = mergeFeedPosts(existing, incoming);
    expect(newCount).toBe(2);
    expect(merged.map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("dedupes posts already in the feed", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const incoming = [
      makePost("a", "2026-01-01T10:00:00Z"),
      makePost("b", "2026-01-01T11:00:00Z"),
    ];
    const { merged, newCount } = mergeFeedPosts(existing, incoming);
    expect(newCount).toBe(1);
    expect(merged.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("sorts out-of-order incoming posts by uploadedAt then id", () => {
    const existing = [makePost("d", "2026-01-01T13:00:00Z")];
    const incoming = [
      makePost("b", "2026-01-01T11:00:00Z"),
      makePost("c", "2026-01-01T12:00:00Z"),
    ];
    const { merged, newCount } = mergeFeedPosts(existing, incoming);
    expect(newCount).toBe(2);
    expect(merged.map((p) => p.id)).toEqual(["d", "c", "b"]);
  });

  it("uses id as tiebreaker for identical uploadedAt", () => {
    const existing = [makePost("a", "2026-01-01T10:00:00Z")];
    const incoming = [
      makePost("c", "2026-01-01T10:00:00Z"),
      makePost("b", "2026-01-01T10:00:00Z"),
    ];
    const { merged, newCount } = mergeFeedPosts(existing, incoming);
    expect(newCount).toBe(2);
    expect(merged.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
});
