import { describe, expect, it } from "vitest";
import {
  aggregateContributors,
  wallSummary,
} from "@/lib/wall-contributors";

describe("aggregateContributors", () => {
  it("returns empty list when there are no posts", () => {
    expect(aggregateContributors([])).toEqual([]);
  });

  it("counts multiple posts from the same uploader as one contributor", () => {
    expect(
      aggregateContributors([
        { uploaderName: "Alex" },
        { uploaderName: "Alex" },
        { uploaderName: "Sam" },
      ])
    ).toEqual([
      { name: "Alex", postCount: 2 },
      { name: "Sam", postCount: 1 },
    ]);
  });

  it("sorts by post count descending then name ascending", () => {
    expect(
      aggregateContributors([
        { uploaderName: "Zara" },
        { uploaderName: "Alex" },
        { uploaderName: "Alex" },
        { uploaderName: "Morgan" },
        { uploaderName: "Morgan" },
      ])
    ).toEqual([
      { name: "Alex", postCount: 2 },
      { name: "Morgan", postCount: 2 },
      { name: "Zara", postCount: 1 },
    ]);
  });

  it("excludes zero-count names", () => {
    expect(aggregateContributors([{ uploaderName: "Alex" }])).toEqual([
      { name: "Alex", postCount: 1 },
    ]);
  });
});

describe("wallSummary", () => {
  it("returns zero totals for an empty contributor list", () => {
    expect(wallSummary([])).toEqual({
      contributorCount: 0,
      totalPosts: 0,
    });
  });

  it("sums contributor counts and post totals", () => {
    expect(
      wallSummary([
        { name: "Alex", postCount: 2 },
        { name: "Sam", postCount: 1 },
      ])
    ).toEqual({
      contributorCount: 2,
      totalPosts: 3,
    });
  });
});
