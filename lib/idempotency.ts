import { cacheGet, cacheSet } from "@/lib/cache";
import { IDEMPOTENCY_TTL_SEC, idempotencyKey } from "@/lib/cache-keys";

type StoredIdempotency<T> = {
  status: number;
  body: T;
};

export type IdempotencyResult<T> = {
  status: number;
  body: T;
  replayed: boolean;
};

/**
 * Dedupe upload POSTs when the client retries after storage succeeded.
 * Without a key, runs the handler normally (backward compatible).
 */
export async function withIdempotency<T>(
  eventId: string,
  clientKey: string | undefined,
  handler: () => Promise<{ status: number; body: T }>
): Promise<IdempotencyResult<T>> {
  if (!clientKey) {
    const result = await handler();
    return { ...result, replayed: false };
  }

  const key = idempotencyKey(eventId, clientKey);
  const cached = await cacheGet<StoredIdempotency<T>>(key);
  if (cached && cached.status >= 200 && cached.status < 300) {
    return { ...cached, replayed: true };
  }

  const result = await handler();

  if (result.status >= 200 && result.status < 300) {
    await cacheSet(key, result, IDEMPOTENCY_TTL_SEC);
  }

  return { ...result, replayed: false };
}
