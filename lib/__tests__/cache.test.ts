import { describe, expect, it } from "vitest";
import { cachedJson } from "@/lib/cache";
import {
  feedCacheKey,
  feedVersionKey,
  idempotencyKey,
  lookupInviteKey,
  wallKey,
} from "@/lib/cache-keys";

describe("cache key builders", () => {
  it("builds stable feed cache keys", () => {
    expect(feedVersionKey("evt1")).toBe("cache:feed:v:evt1");
    expect(feedCacheKey("evt1", 3, null, null, null)).toBe(
      "cache:feed:evt1:v3:all:start:all"
    );
    expect(feedCacheKey("evt1", 1, "m1", "c1", 20)).toBe(
      "cache:feed:evt1:v1:m1:c1:20"
    );
  });

  it("builds lookup and wall keys", () => {
    expect(lookupInviteKey("ABC123")).toBe("cache:lookup:invite:ABC123");
    expect(wallKey("evt1")).toBe("cache:wall:evt1");
    expect(idempotencyKey("evt1", "uuid")).toBe("idempotency:evt1:uuid");
  });
});

describe("cachedJson (no Redis)", () => {
  it("calls fetcher on each request when Redis is unset", async () => {
    let calls = 0;
    const key = "cache:test:no-redis-" + Date.now();

    const result = await cachedJson(key, 60, async () => {
      calls += 1;
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });
    expect(calls).toBe(1);

    const again = await cachedJson(key, 60, async () => {
      calls += 1;
      return { ok: false };
    });
    expect(again).toEqual({ ok: false });
    expect(calls).toBe(2);
  });
});
