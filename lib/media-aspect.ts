export type MediaOrientation = "portrait" | "landscape" | "square" | "unknown";

const PORTRAIT_MAX = 0.85;
const LANDSCAPE_MIN = 1.15;

export function aspectRatio(
  width: number | null | undefined,
  height: number | null | undefined
): number | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return width / height;
}

export function getMediaOrientation(
  width: number | null | undefined,
  height: number | null | undefined
): MediaOrientation {
  const ratio = aspectRatio(width, height);
  if (ratio === null) return "unknown";
  if (ratio < PORTRAIT_MAX) return "portrait";
  if (ratio > LANDSCAPE_MIN) return "landscape";
  return "square";
}

/** CSS aspect-ratio value, e.g. "3/4", or null when unknown. */
export function aspectRatioStyleValue(
  width: number | null | undefined,
  height: number | null | undefined
): string | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return `${width}/${height}`;
}

/** Uniform square tiles for grid view. */
export function photoGridTileClasses(
  _width?: number | null | undefined,
  _height?: number | null | undefined
): string {
  return "aspect-square";
}

/** Feed tile classes for a single photo with optional dimensions. */
export function feedSinglePhotoClasses(
  width: number | null | undefined,
  height: number | null | undefined
): string {
  const ratio = aspectRatioStyleValue(width, height);
  if (!ratio) return "w-full";
  return "w-full max-h-[70vh]";
}

/** Feed layout for two-photo posts when dimensions are known. */
export function feedTwoPhotoLayout(
  a: { width?: number | null; height?: number | null },
  b: { width?: number | null; height?: number | null }
): "portrait-row" | "landscape-stack" | "square-grid" {
  const oa = getMediaOrientation(a.width, a.height);
  const ob = getMediaOrientation(b.width, b.height);
  if (oa === "portrait" && ob === "portrait") return "portrait-row";
  if (oa === "landscape" && ob === "landscape") return "landscape-stack";
  return "square-grid";
}
