/** Parse `Range: bytes=start-end` into an S3-compatible range string. */
export function parseRangeHeader(
  rangeHeader: string | null
): string | undefined {
  if (!rangeHeader) return undefined;

  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return undefined;

  const start = match[1];
  const end = match[2];
  if (end) return `bytes=${start}-${end}`;
  return `bytes=${start}-`;
}

/** Build a Content-Range response header from S3 metadata. */
export function buildContentRange(
  contentRange: string | undefined,
  contentLength: number | undefined,
  totalSize: number | undefined
): string | null {
  if (contentRange) return contentRange;
  if (contentLength != null && totalSize != null) {
    return `bytes 0-${contentLength - 1}/${totalSize}`;
  }
  return null;
}
