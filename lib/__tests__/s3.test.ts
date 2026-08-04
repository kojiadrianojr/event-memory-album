import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { objectKeyFromPublicUrl } from "@/lib/s3";

describe("objectKeyFromPublicUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      S3_ENDPOINT: "http://localhost:9000",
      S3_PUBLIC_URL: "http://localhost:9001/photo-album",
      S3_BUCKET_NAME: "photo-album",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("matches the configured public base URL", () => {
    expect(
      objectKeyFromPublicUrl(
        "http://localhost:9001/photo-album/events/e1/photo.jpg"
      )
    ).toBe("events/e1/photo.jpg");
  });

  it("extracts key from LAN URLs stored in the database", () => {
    expect(
      objectKeyFromPublicUrl(
        "http://192.168.68.130:9000/photo-album/events/e1/video.mov"
      )
    ).toBe("events/e1/video.mov");
  });

  it("extracts thumbnail keys from alternate hosts", () => {
    expect(
      objectKeyFromPublicUrl(
        "http://192.168.68.130:9000/photo-album/events/e1/thumbs/abc.webp"
      )
    ).toBe("events/e1/thumbs/abc.webp");
  });

  it("returns null for unrelated URLs", () => {
    expect(objectKeyFromPublicUrl("https://example.com/other/file.jpg")).toBeNull();
  });
});
