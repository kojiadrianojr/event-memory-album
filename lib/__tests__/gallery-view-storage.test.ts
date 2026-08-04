import { describe, expect, it, vi } from "vitest";
import {
  galleryViewModeKey,
  getGalleryViewMode,
  setGalleryViewMode,
} from "@/lib/gallery-view-storage";

describe("gallery-view-storage", () => {
  it("uses a per-event storage key", () => {
    expect(galleryViewModeKey("evt-test")).toBe("galleryViewMode:evt-test");
  });

  it("defaults to feed and persists grid mode", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    expect(getGalleryViewMode("evt-test")).toBe("feed");
    setGalleryViewMode("evt-test", "grid");
    expect(getGalleryViewMode("evt-test")).toBe("grid");

    store.set("galleryViewMode:evt-legacy", "photos");
    expect(getGalleryViewMode("evt-legacy")).toBe("grid");

    vi.unstubAllGlobals();
  });
});
