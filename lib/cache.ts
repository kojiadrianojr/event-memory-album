import { getRedis } from "@/lib/redis";
import { upstashCommand, upstashPipeline } from "@/lib/upstash";

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

async function upstashGet(key: string): Promise<string | null> {
  const result = (await upstashCommand(`get/${encodeURIComponent(key)}`)) as
    | string
    | null;
  return result;
}

async function upstashSet(
  key: string,
  value: string,
  ttlSec: number
): Promise<boolean> {
  const result = await upstashCommand(
    `set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSec}`
  );
  return result === "OK";
}

async function upstashSetNx(
  key: string,
  value: string,
  ttlSec: number
): Promise<boolean> {
  const results = await upstashPipeline(["SET", key, value, "NX", "EX", ttlSec]);
  if (!results) return false;
  const first = results[0] as string | null;
  return first === "OK";
}

async function upstashDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const path = keys.map((k) => encodeURIComponent(k)).join("/");
  await upstashCommand(`del/${path}`);
}

async function upstashIncr(key: string): Promise<number | null> {
  const result = (await upstashCommand(`incr/${encodeURIComponent(key)}`)) as
    | number
    | null;
  return result;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const upstashRaw = await upstashGet(key);
  if (upstashRaw !== null) {
    return deserialize<T>(upstashRaw);
  }

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
  const serialized = serialize(value);

  const upstashOk = await upstashSet(key, serialized, ttlSec);
  if (upstashOk) return;

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, serialized, { EX: ttlSec });
    } catch {
      // no-op
    }
  }
}

/** SET NX with TTL — returns true if the key was set (first writer wins). */
export async function cacheSetNx(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<boolean> {
  const serialized = serialize(value);

  const upstashOk = await upstashSetNx(key, serialized, ttlSec);
  if (upstashOk) return true;

  const redis = await getRedis();
  if (redis) {
    try {
      const result = await redis.set(key, serialized, { NX: true, EX: ttlSec });
      return result === "OK";
    } catch {
      return false;
    }
  }

  return false;
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await upstashDel(...keys);

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(keys);
    } catch {
      // no-op
    }
  }
}

export async function cacheIncr(key: string): Promise<number | null> {
  const upstashResult = await upstashIncr(key);
  if (upstashResult !== null) return upstashResult;

  const redis = await getRedis();
  if (redis) {
    try {
      return await redis.incr(key);
    } catch {
      return null;
    }
  }

  return null;
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

  // Version keys store plain integers via INCR — try direct string read
  const upstashRaw = await upstashGet(key);
  if (upstashRaw !== null) {
    const n = parseInt(upstashRaw, 10);
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
