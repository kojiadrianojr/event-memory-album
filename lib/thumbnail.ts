import sharp from "sharp";

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 70;

/**
 * Resizes an image buffer down to a mobile-friendly webp thumbnail.
 * Never upscales — images already narrower than THUMBNAIL_WIDTH are only re-encoded.
 */
export async function createThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

export function thumbnailObjectKey(objectKey: string): string {
  const lastSlash = objectKey.lastIndexOf("/");
  const dir = lastSlash === -1 ? "" : objectKey.slice(0, lastSlash + 1);
  const basename = lastSlash === -1 ? objectKey : objectKey.slice(lastSlash + 1);
  const withoutExt = basename.replace(/\.[^./]+$/, "");
  return `${dir}thumbs/${withoutExt}.webp`;
}
