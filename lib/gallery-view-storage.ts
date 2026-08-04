export type GalleryViewMode = "feed" | "grid";

export function galleryViewModeKey(eventId: string): string {
  return `galleryViewMode:${eventId}`;
}

export function getGalleryViewMode(eventId: string): GalleryViewMode {
  try {
    const stored = localStorage.getItem(galleryViewModeKey(eventId));
    return stored === "grid" || stored === "photos" ? "grid" : "feed";
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
