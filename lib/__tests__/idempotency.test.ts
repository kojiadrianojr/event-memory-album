import { describe, expect, it } from "vitest";
import { withIdempotency } from "@/lib/idempotency";

describe("withIdempotency (no Redis)", () => {
  it("runs the handler when no idempotency key is provided", async () => {
    let calls = 0;
    const result = await withIdempotency("evt1", undefined, async () => {
      calls += 1;
      return { status: 201, body: { id: "post1" } };
    });

    expect(result).toEqual({
      status: 201,
      body: { id: "post1" },
      replayed: false,
    });
    expect(calls).toBe(1);
  });

  it("executes handler when Redis is unavailable (no replay without store)", async () => {
    let calls = 0;
    const key = crypto.randomUUID();

    const first = await withIdempotency("evt1", key, async () => {
      calls += 1;
      return { status: 201, body: { id: "post1" } };
    });
    expect(first.replayed).toBe(false);
    expect(calls).toBe(1);

    const second = await withIdempotency("evt1", key, async () => {
      calls += 1;
      return { status: 201, body: { id: "post2" } };
    });
    expect(second.replayed).toBe(false);
    expect(calls).toBe(2);
  });
});
