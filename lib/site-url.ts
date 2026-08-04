function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function configuredSiteUrl(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_WEBSITE_URL,
    process.env.WEBSITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];
  const url = candidates.find((value) => value && value.trim().length > 0);
  return url ? normalizeSiteUrl(url) : undefined;
}

/** Public site origin for shareable links (server). */
export function getSiteUrl(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(`https://${process.env.VERCEL_URL}`);
  }
  return "http://localhost:3000";
}

/** Public site origin in the browser; falls back to the current origin in dev. */
export function getClientSiteUrl(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return getSiteUrl();
}

export function absoluteSiteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function clientAbsoluteSiteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getClientSiteUrl()}${normalizedPath}`;
}
