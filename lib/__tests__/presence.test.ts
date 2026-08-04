import { describe, expect, it } from "vitest";
import { presenceMinScore } from "@/lib/presence";
import { PRESENCE_TTL_SEC } from "@/lib/cache-keys";

describe("presenceMinScore", () => {
  it("returns a window start PRESENCE_TTL_SEC before now", () => {
    const now = 1_700_000_000_000;
    expect(presenceMinScore(now)).toBe(now - PRESENCE_TTL_SEC * 1000);
  });
});
