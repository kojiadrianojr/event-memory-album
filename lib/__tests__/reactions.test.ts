import { describe, expect, it } from "vitest";
import {
  countFor,
  groupReactors,
  groupReactorsByGuest,
  hasReacted,
  reactorSummaryLabel,
  totalReactionCount,
  uniqueReactorNames,
} from "@/lib/reactions";
import type { Reaction } from "@/components/gallery/types";

function reaction(
  emoji: string,
  guestName: string,
  id = `${emoji}-${guestName}`
): Reaction {
  return {
    id,
    postId: "post_1",
    emoji,
    guestName,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("countFor", () => {
  it("returns zero for empty reactions", () => {
    expect(countFor([], "❤️")).toBe(0);
  });

  it("counts reactions for a specific emoji", () => {
    const reactions = [
      reaction("❤️", "Alice"),
      reaction("❤️", "Bob"),
      reaction("😂", "Alice"),
    ];
    expect(countFor(reactions, "❤️")).toBe(2);
    expect(countFor(reactions, "😂")).toBe(1);
  });
});

describe("hasReacted", () => {
  it("returns false when guest has not reacted", () => {
    expect(hasReacted([reaction("❤️", "Alice")], "❤️", "Bob")).toBe(false);
  });

  it("returns true when guest has reacted with emoji", () => {
    expect(hasReacted([reaction("❤️", "Alice")], "❤️", "Alice")).toBe(true);
  });
});

describe("totalReactionCount", () => {
  it("returns total reaction rows", () => {
    expect(totalReactionCount([])).toBe(0);
    expect(
      totalReactionCount([
        reaction("❤️", "Alice"),
        reaction("😂", "Alice"),
        reaction("❤️", "Bob"),
      ])
    ).toBe(3);
  });
});

describe("groupReactors", () => {
  it("returns empty array when no reactions", () => {
    expect(groupReactors([])).toEqual([]);
  });

  it("groups guest names by emoji in emoji order", () => {
    const reactions = [
      reaction("😂", "Bob"),
      reaction("❤️", "Alice"),
      reaction("❤️", "Bob"),
    ];
    expect(groupReactors(reactions)).toEqual([
      { emoji: "❤️", guestNames: ["Alice", "Bob"] },
      { emoji: "😂", guestNames: ["Bob"] },
    ]);
  });

  it("dedupes guest names per emoji", () => {
    const reactions = [
      reaction("❤️", "Alice", "r1"),
      reaction("❤️", "Alice", "r2"),
    ];
    expect(groupReactors(reactions)).toEqual([
      { emoji: "❤️", guestNames: ["Alice"] },
    ]);
  });

  it("filters to a single emoji when requested", () => {
    const reactions = [
      reaction("❤️", "Alice"),
      reaction("😂", "Bob"),
    ];
    expect(groupReactors(reactions, "❤️")).toEqual([
      { emoji: "❤️", guestNames: ["Alice"] },
    ]);
  });
});

describe("uniqueReactorNames", () => {
  it("returns unique guest names in first-seen order", () => {
    const reactions = [
      reaction("❤️", "Alice"),
      reaction("😂", "Bob"),
      reaction("❤️", "Alice"),
      reaction("👏", "Cara"),
    ];
    expect(uniqueReactorNames(reactions)).toEqual(["Alice", "Bob", "Cara"]);
  });
});

describe("reactorSummaryLabel", () => {
  it("formats one, two, and many reactor names", () => {
    expect(reactorSummaryLabel([reaction("❤️", "Alice")])).toBe("Alice");
    expect(
      reactorSummaryLabel([
        reaction("❤️", "Alice"),
        reaction("😂", "Bob"),
      ])
    ).toBe("Alice and Bob");
    expect(
      reactorSummaryLabel([
        reaction("❤️", "Alice"),
        reaction("😂", "Bob"),
        reaction("👏", "Cara"),
      ])
    ).toBe("Alice, Bob and 1 other");
  });
});

describe("groupReactorsByGuest", () => {
  it("groups emojis per guest without duplicate rows", () => {
    const reactions = [
      reaction("❤️", "Alice"),
      reaction("😂", "Alice"),
      reaction("❤️", "Bob"),
      reaction("😂", "Bob"),
      reaction("😂", "Bob", "dup"),
    ];
    expect(groupReactorsByGuest(reactions)).toEqual([
      { guestName: "Alice", emojis: ["❤️", "😂"] },
      { guestName: "Bob", emojis: ["❤️", "😂"] },
    ]);
  });
});
