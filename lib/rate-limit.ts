import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export type RateLimitConfig = {
  /** Namespace for this limiter (e.g. "create-event"). */
  bucket: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

type IncrementResult = {
  count: number;
  limited: boolean;
  retryAfterSec: number;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Presets — override individual limits via env vars documented in .env.local.example */
export const RATE_LIMITS = {
  createEvent: {
    bucket: "create-event",
    limit: parseEnvInt("RATE_LIMIT_CREATE_EVENT", 10),
    windowMs: 60 * 60 * 1000,
  },
  presignedUpload: {
    bucket: "presigned-upload",
    limit: parseEnvInt("RATE_LIMIT_PRESIGNED", 60),
    windowMs: 60 * 1000,
  },
  recordMedia: {
    bucket: "record-media",
    limit: parseEnvInt("RATE_LIMIT_RECORD_MEDIA", 120),
    windowMs: 60 * 1000,
  },
  inviteAuth: {
    bucket: "invite-auth",
    limit: parseEnvInt("RATE_LIMIT_INVITE_AUTH", 30),
    windowMs: 60 * 1000,
  },
  hostAccessAuth: {
    bucket: "host-access-auth",
    limit: parseEnvInt("RATE_LIMIT_HOST_ACCESS_AUTH", 30),
    windowMs: 60 * 1000,
  },
} satisfies Record<string, RateLimitConfig>;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function memoryIncrement(
  key: string,
  config: RateLimitConfig
): IncrementResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { count: 1, limited: false, retryAfterSec: 0 };
  }

  entry.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  if (entry.count > config.limit) {
    return { count: entry.count, limited: true, retryAfterSec };
  }

  return { count: entry.count, limited: false, retryAfterSec: 0 };
}

function windowIncrementResult(
  count: number,
  config: RateLimitConfig,
  windowStart: number
): IncrementResult {
  const windowEnd = (windowStart + 1) * config.windowMs;
  const retryAfterSec = Math.max(
    1,
    Math.ceil((windowEnd - Date.now()) / 1000)
  );

  return {
    count,
    limited: count > config.limit,
    retryAfterSec,
  };
}

async function redisIncrement(
  key: string,
  config: RateLimitConfig
): Promise<IncrementResult | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const windowStart = Math.floor(Date.now() / config.windowMs);
  const redisKey = `ratelimit:${config.bucket}:${key}:${windowStart}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }
    return windowIncrementResult(count, config, windowStart);
  } catch {
    return null;
  }
}

async function increment(
  identifier: string,
  config: RateLimitConfig
): Promise<IncrementResult> {
  const key = `${config.bucket}:${identifier}`;

  const redis = await redisIncrement(key, config);
  if (redis) return redis;

  return memoryIncrement(key, config);
}

/**
 * Returns a 429 response when the limit is exceeded, otherwise null.
 */
export async function enforceRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await increment(ip, config);

  if (!result.limited) return null;

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    }
  );
}
