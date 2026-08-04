export type S3UploadMode = "presigned" | "direct";

/** How the browser sends files to storage. */
export function getS3UploadMode(): S3UploadMode {
  const explicit = process.env.S3_DIRECT_UPLOAD;
  if (explicit === "true") return "direct";
  if (explicit === "false") return "presigned";
  // HTTPS app + HTTP MinIO (typical Pangolin / reverse-proxy deploy) — browsers
  // block presigned PUTs as mixed content; proxy through the app instead.
  if (process.env.COOKIE_SECURE === "true") return "direct";
  return "presigned";
}
