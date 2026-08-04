export function mediaFileUrl(
  mediaId: string,
  options?: { thumb?: boolean }
): string {
  const base = `/api/media/${mediaId}/file`;
  return options?.thumb ? `${base}?variant=thumb` : base;
}

/** Same-origin proxy URL for playback (supports HTTP Range on the file route). */
export function mediaPlaybackUrl(media: {
  id: string;
  url: string | null;
  type: string;
}): string {
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
