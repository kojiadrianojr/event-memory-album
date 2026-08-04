import { getRedis } from "@/lib/redis";
import { PRESENCE_TTL_SEC, presenceKey } from "@/lib/cache-keys";
import { upstashPipeline } from "@/lib/upstash";

/** Minimum score (ms) for a guest to count as online. Exported for tests. */
export function presenceMinScore(nowMs: number): number {
  return nowMs - PRESENCE_TTL_SEC * 1000;
}

export async function recordPresence(
  eventId: string,
  guestName: string
): Promise<void> {
  const key = presenceKey(eventId);
  const now = Date.now();
  const minScore = presenceMinScore(now);
  const expireSec = PRESENCE_TTL_SEC * 2;

  const pipelineResult = await upstashPipeline(
    ["ZADD", key, now, guestName],
    ["ZREMRANGEBYSCORE", key, 0, minScore],
    ["EXPIRE", key, expireSec]
  );
  if (pipelineResult) return;

  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.zAdd(key, { score: now, value: guestName });
    await redis.zRemRangeByScore(key, 0, minScore);
    await redis.expire(key, expireSec);
  } catch {
    // no-op
  }
}

export async function listPresence(eventId: string): Promise<string[]> {
  const key = presenceKey(eventId);
  const minScore = presenceMinScore(Date.now());

  const pipelineResult = await upstashPipeline([
    "ZRANGEBYSCORE",
    key,
    minScore,
    "+inf",
  ]);
  if (pipelineResult && Array.isArray(pipelineResult[0])) {
    return pipelineResult[0] as string[];
  }

  const redis = await getRedis();
  if (!redis) return [];

  try {
    return await redis.zRangeByScore(key, minScore, "+inf");
  } catch {
    return [];
  }
}
