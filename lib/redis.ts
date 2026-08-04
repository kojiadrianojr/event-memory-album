import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

/** Lazy singleton Redis client; null when REDIS_URL is unset or connection fails. */
export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const c = createClient({ url });
        c.on("error", () => {
          // Swallow — callers fall back to in-memory rate limits.
        });
        await c.connect();
        client = c as RedisClientType;
        return client;
      } catch {
        connectPromise = null;
        return null;
      }
    })();
  }

  return connectPromise;
}
