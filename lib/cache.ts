import { getRedis } from "@/lib/redis";

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function deserialize<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Default ceiling on any single Redis round-trip. */
const REDIS_TIMEOUT_MS = 1_000;

const TIMED_OUT = Symbol("redis-timeout");

/**
 * Caps a Redis command so a dead or unreachable server degrades to a cache miss
 * instead of stalling the request. A client that has lost its connection queues
 * commands rather than rejecting, so a rejected promise is not enough on its own.
 */
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await withTimeout(redis.get(key), REDIS_TIMEOUT_MS);
      if (raw !== TIMED_OUT && raw) return deserialize<T>(raw);
    } catch {
      // fall through
    }
  }

  return null;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await withTimeout(redis.set(key, serialize(value), { EX: ttlSec }), REDIS_TIMEOUT_MS);
  } catch {
    // no-op
  }
}

/** SET NX with TTL — returns true if the key was set (first writer wins). */
export async function cacheSetNx(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  try {
    const result = await withTimeout(
      redis.set(key, serialize(value), { NX: true, EX: ttlSec }),
      REDIS_TIMEOUT_MS
    );
    return result === "OK";
  } catch {
    return false;
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const redis = await getRedis();
  if (!redis) return;

  try {
    await withTimeout(redis.del(keys), REDIS_TIMEOUT_MS);
  } catch {
    // no-op
  }
}

export async function cacheIncr(key: string): Promise<number | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const result = await withTimeout(redis.incr(key), REDIS_TIMEOUT_MS);
    return result === TIMED_OUT ? null : result;
  } catch {
    return null;
  }
}

/** Read feed version; defaults to 0 when unset or Redis unavailable. */
export async function cacheGetVersion(key: string): Promise<number> {
  const cached = await cacheGet<number>(key);
  if (typeof cached === "number" && Number.isFinite(cached)) return cached;

  const raw = await cacheGet<string>(key);
  if (raw !== null) {
    const n = parseInt(String(raw), 10);
    if (Number.isFinite(n)) return n;
  }

  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) return n;
      }
    } catch {
      // fall through
    }
  }

  return 0;
}

/**
 * Reads a version counter, distinguishing "counter is 0" from "Redis is not
 * usable". Returns null in the latter case so callers can fall back instead of
 * trusting a frozen counter — `getRedis()` returning a client is not proof the
 * connection is alive, so the read itself is the probe.
 */
export async function cacheProbeVersion(
  key: string,
  timeoutMs = REDIS_TIMEOUT_MS
): Promise<number | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await withTimeout(redis.get(key), timeoutMs);
    if (raw === TIMED_OUT) return null;
    if (!raw) return 0;

    const parsed = parseInt(String(raw), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return null;
  }
}

export async function cachedJson<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<{ v: T }>(key);
  if (hit !== null && typeof hit === "object" && "v" in hit) {
    return hit.v;
  }

  const value = await fetcher();
  await cacheSet(key, { v: value }, ttlSec);
  return value;
}
