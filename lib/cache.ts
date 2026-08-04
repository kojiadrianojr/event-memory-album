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

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) return deserialize<T>(raw);
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
    await redis.set(key, serialize(value), { EX: ttlSec });
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
    const result = await redis.set(key, serialize(value), { NX: true, EX: ttlSec });
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
    await redis.del(keys);
  } catch {
    // no-op
  }
}

export async function cacheIncr(key: string): Promise<number | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    return await redis.incr(key);
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
