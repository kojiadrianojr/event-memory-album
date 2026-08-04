import { describe, expect, it } from "vitest";
import {
  mediaFileUrl,
  mediaPlaybackUrl,
  mediaPosterUrl,
} from "@/lib/media-url";

describe("mediaPlaybackUrl", () => {
  it("returns proxy URL for videos", () => {
    expect(
      mediaPlaybackUrl({
        id: "media_1",
        url: "http://localhost:9000/bucket/events/e1/v.mp4",
        type: "VIDEO",
      })
    ).toBe("/api/media/media_1/file");
  });

  it("returns proxy URL for photos", () => {
    expect(
      mediaPlaybackUrl({
        id: "media_1",
        url: "http://localhost:9000/bucket/events/e1/p.jpg",
        type: "PHOTO",
      })
    ).toBe("/api/media/media_1/file");
  });

  it("falls back to proxy when video has no url", () => {
    expect(
      mediaPlaybackUrl({
        id: "media_1",
        url: null,
        type: "VIDEO",
      })
    ).toBe("/api/media/media_1/file");
  });
});

describe("mediaPosterUrl", () => {
  it("returns thumb proxy when thumbnail exists", () => {
    expect(
      mediaPosterUrl({
        id: "media_1",
        thumbnailUrl: "http://localhost:9000/bucket/thumb.webp",
      })
    ).toBe("/api/media/media_1/file?variant=thumb");
  });

  it("returns undefined when no thumbnail", () => {
    expect(
      mediaPosterUrl({ id: "media_1", thumbnailUrl: null })
    ).toBeUndefined();
  });
});

describe("mediaFileUrl", () => {
  it("builds full and thumb URLs", () => {
    expect(mediaFileUrl("abc")).toBe("/api/media/abc/file");
    expect(mediaFileUrl("abc", { thumb: true })).toBe(
      "/api/media/abc/file?variant=thumb"
    );
  });
});
