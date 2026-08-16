import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

/** Ceiling on a connection attempt so a down server fails fast. */
const CONNECT_TIMEOUT_MS = 1_000;

/** Lazy singleton Redis client; null when REDIS_URL is unset or unreachable. */
export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client?.isOpen) return client;

  // A client whose socket has dropped would queue commands forever instead of
  // rejecting them. Discard it so the next call reconnects or fails fast.
  if (client && !client.isOpen) {
    client = null;
    connectPromise = null;
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      const c = createClient({
        url,
        socket: {
          connectTimeout: CONNECT_TIMEOUT_MS,
          // Without this, a lost connection retries forever and every command
          // issued meanwhile hangs rather than failing.
          reconnectStrategy: false,
        },
      });
      c.on("error", () => {
        // Swallow — callers fall back to the database / in-memory limits.
      });

      try {
        await c.connect();
        client = c as RedisClientType;
        return client;
      } catch {
        try {
          c.destroy();
        } catch {
          // already torn down
        }
        client = null;
        connectPromise = null;
        return null;
      }
    })();
  }

  return connectPromise;
}
