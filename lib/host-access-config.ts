export function getHostAccessSecret(): string | null {
  const secret = process.env.HOST_ACCESS_SECRET;
  if (!secret || secret.length === 0) return null;
  return secret;
}

export function isHostAccessConfigured(): boolean {
  return getHostAccessSecret() !== null;
}
