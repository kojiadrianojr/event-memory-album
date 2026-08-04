import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, runWithConcurrency } from "@/lib/upload-queue";

describe("runWithConcurrency", () => {
  it("returns an empty array for no tasks", async () => {
    expect(await runWithConcurrency([])).toEqual([]);
  });

  it("runs all tasks and preserves result order", async () => {
    const tasks = [0, 1, 2, 3, 4].map(
      (n) => () => Promise.resolve(n * 2)
    );
    expect(await runWithConcurrency(tasks, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 6 }, () => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return true;
    });

    await runWithConcurrency(tasks, 3);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the response on success", async () => {
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }));

    const result = await fetchWithRetry("/api/test", undefined, { fetchFn });

    expect(result).toEqual({
      ok: true,
      response: expect.any(Response),
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 using Retry-After then succeeds", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("slow down", {
          status: 429,
          headers: { "Retry-After": "2" },
        })
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const promise = fetchWithRetry("/api/test", undefined, { fetchFn });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns a rate-limit message after exhausting retries on 429", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async () =>
      new Response("slow down", {
        status: 429,
        headers: { "Retry-After": "1" },
      })
    );

    const promise = fetchWithRetry("/api/test", undefined, {
      fetchFn,
      maxAttempts: 2,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual({ ok: false, errorMessage: "Rate limited. Try again." });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries on network errors with backoff", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("ok", { status: 201 }));

    const promise = fetchWithRetry("/api/test", undefined, { fetchFn });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns a network error after exhausting retries", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });

    const promise = fetchWithRetry("/api/test", undefined, {
      fetchFn,
      maxAttempts: 2,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual({ ok: false, errorMessage: "Network error." });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
