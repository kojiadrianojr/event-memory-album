export type GalleryViewMode = "feed" | "photos";

export function galleryViewModeKey(eventId: string): string {
  return `galleryViewMode:${eventId}`;
}

export function getGalleryViewMode(eventId: string): GalleryViewMode {
  try {
    const stored = localStorage.getItem(galleryViewModeKey(eventId));
    return stored === "photos" ? "photos" : "feed";
  } catch {
    return "feed";
  }
}

export function setGalleryViewMode(
  eventId: string,
  mode: GalleryViewMode
): void {
  try {
    localStorage.setItem(galleryViewModeKey(eventId), mode);
  } catch {
    // ignore
  }
}
