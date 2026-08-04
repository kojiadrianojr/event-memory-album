import { describe, expect, it } from "vitest";
import {
  aspectRatio,
  aspectRatioStyleValue,
  feedTwoPhotoLayout,
  getMediaOrientation,
  photoGridTileClasses,
} from "@/lib/media-aspect";

describe("media-aspect", () => {
  it("returns null ratio when dimensions are missing", () => {
    expect(aspectRatio(null, 100)).toBeNull();
    expect(aspectRatio(100, undefined)).toBeNull();
  });

  it("classifies orientations", () => {
    expect(getMediaOrientation(900, 1600)).toBe("portrait");
    expect(getMediaOrientation(1600, 900)).toBe("landscape");
    expect(getMediaOrientation(1000, 1000)).toBe("square");
    expect(getMediaOrientation(null, null)).toBe("unknown");
  });

  it("builds aspect ratio style values", () => {
    expect(aspectRatioStyleValue(1200, 800)).toBe("1200/800");
    expect(aspectRatioStyleValue(0, 800)).toBeNull();
  });

  it("assigns photo grid spans for landscape on mobile", () => {
    expect(photoGridTileClasses(1600, 900)).toContain("col-span-2");
    expect(photoGridTileClasses(900, 1600)).toContain("col-span-1");
    expect(photoGridTileClasses(null, null)).toContain("aspect-square");
  });

  it("picks two-photo feed layouts from orientations", () => {
    expect(
      feedTwoPhotoLayout(
        { width: 900, height: 1600 },
        { width: 800, height: 1400 }
      )
    ).toBe("portrait-row");
    expect(
      feedTwoPhotoLayout(
        { width: 1600, height: 900 },
        { width: 1400, height: 800 }
      )
    ).toBe("landscape-stack");
    expect(
      feedTwoPhotoLayout(
        { width: 900, height: 1600 },
        { width: 1600, height: 900 }
      )
    ).toBe("square-grid");
  });
});
