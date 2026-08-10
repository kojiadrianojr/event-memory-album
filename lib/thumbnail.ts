import sharp from "sharp";

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 70;
const LARGE_WIDTH = 1600;
const LARGE_QUALITY = 82;

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Reads width/height after EXIF auto-orientation. */
export async function getImageDimensions(
  input: Buffer
): Promise<ImageDimensions | null> {
  try {
    const meta = await sharp(input).rotate().metadata();
    if (
      typeof meta.width !== "number" ||
      typeof meta.height !== "number" ||
      meta.width <= 0 ||
      meta.height <= 0
    ) {
      return null;
    }
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

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
  return variantObjectKey(objectKey, "thumbs");
}

/**
 * Resizes an image buffer down to a lightbox-friendly webp variant.
 * Never upscales — images already narrower than LARGE_WIDTH are only re-encoded.
 */
export async function createLargeVariant(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: LARGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: LARGE_QUALITY })
    .toBuffer();
}

export function largeObjectKey(objectKey: string): string {
  return variantObjectKey(objectKey, "large");
}

function variantObjectKey(objectKey: string, folder: string): string {
  const lastSlash = objectKey.lastIndexOf("/");
  const dir = lastSlash === -1 ? "" : objectKey.slice(0, lastSlash + 1);
  const basename = lastSlash === -1 ? objectKey : objectKey.slice(lastSlash + 1);
  const withoutExt = basename.replace(/\.[^./]+$/, "");
  return `${dir}${folder}/${withoutExt}.webp`;
}
