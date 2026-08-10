function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const CACHE_TTL = {
  event: parseEnvInt("CACHE_TTL_EVENT", 900),
  feed: parseEnvInt("CACHE_TTL_FEED", 30),
  wall: parseEnvInt("CACHE_TTL_WALL", 60),
  lookup: parseEnvInt("CACHE_TTL_LOOKUP", 3600),
  mediaFile: parseEnvInt("CACHE_TTL_MEDIA_FILE", 3600),
  moments: 300,
  prompts: 300,
} as const;

export const PRESENCE_TTL_SEC = parseEnvInt("PRESENCE_TTL_SEC", 90);
export const IDEMPOTENCY_TTL_SEC = parseEnvInt("IDEMPOTENCY_TTL_SEC", 86400);

export function eventTokenKey(token: string): string {
  return `cache:event:token:${token}`;
}

export function lookupViewKey(token: string): string {
  return `cache:lookup:view:${token}`;
}

export function lookupInviteKey(code: string): string {
  return `cache:lookup:invite:${code}`;
}

export function lookupEventCodeKey(code: string): string {
  return `cache:lookup:event-code:${code}`;
}

export function feedVersionKey(eventId: string): string {
  return `cache:feed:v:${eventId}`;
}

export function feedCacheKey(
  eventId: string,
  version: number,
  momentId: string | null,
  cursor: string | null,
  limit: number | null
): string {
  const m = momentId ?? "all";
  const c = cursor ?? "start";
  const l = limit ?? "all";
  return `cache:feed:${eventId}:v${version}:${m}:${c}:${l}`;
}

export function momentsKey(eventId: string): string {
  return `cache:moments:${eventId}`;
}

export function promptsKey(eventId: string): string {
  return `cache:prompts:${eventId}`;
}

export function wallKey(eventId: string): string {
  return `cache:wall:${eventId}`;
}

export function idempotencyKey(eventId: string, clientKey: string): string {
  return `idempotency:${eventId}:${clientKey}`;
}

export function mediaFileKey(mediaId: string): string {
  return `cache:media:file:${mediaId}`;
}

export function presenceKey(eventId: string): string {
  return `presence:${eventId}`;
}
