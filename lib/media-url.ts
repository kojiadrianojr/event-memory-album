export type MediaFileVariant = "thumb" | "large";

export function mediaFileUrl(
  mediaId: string,
  options?: { thumb?: boolean; variant?: MediaFileVariant }
): string {
  const base = `/api/media/${mediaId}/file`;
  const variant =
    options?.variant ?? (options?.thumb ? "thumb" : undefined);
  return variant ? `${base}?variant=${variant}` : base;
}

/** Same-origin proxy URL for playback (supports HTTP Range on the file route). */
export function mediaPlaybackUrl(media: {
  id: string;
  url: string | null;
  type: string;
}): string {
  return mediaFileUrl(media.id);
}

/** Lightbox URL for photos — requests the large variant (lazy-generated when missing). */
export function mediaLightboxUrl(media: {
  id: string;
  largeUrl?: string | null;
  url: string | null;
  type: string;
}): string {
  if (media.type === "PHOTO") {
    return mediaFileUrl(media.id, { variant: "large" });
  }
  return mediaFileUrl(media.id);
}

/** Poster/thumbnail URL for grid tiles. */
export function mediaPosterUrl(media: {
  id: string;
  thumbnailUrl: string | null;
}): string | undefined {
  if (media.thumbnailUrl) {
    return mediaFileUrl(media.id, { thumb: true });
  }
  return undefined;
}
