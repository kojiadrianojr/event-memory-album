/** Shared Upstash Redis REST command helper (used by rate-limit, cache, presence). */
export async function upstashCommand(path: string): Promise<unknown> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const res = await fetch(`${base}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: unknown };
  return data.result ?? null;
}

/** Pipeline-style command for complex ops (SET NX, ZADD, etc.). */
export async function upstashPipeline(
  ...commands: (string | number)[][]
): Promise<unknown[] | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: unknown[] };
  return data.result ?? null;
}
