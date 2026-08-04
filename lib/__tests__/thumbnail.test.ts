import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createThumbnail, thumbnailObjectKey } from "@/lib/thumbnail";

describe("thumbnailObjectKey", () => {
  it("nests a thumbs/ folder next to the original and forces .webp", () => {
    expect(thumbnailObjectKey("events/abc123/photo.jpg")).toBe(
      "events/abc123/thumbs/photo.webp"
    );
  });

  it("handles keys with no directory prefix", () => {
    expect(thumbnailObjectKey("photo.png")).toBe("thumbs/photo.webp");
  });

  it("strips only the final extension", () => {
    expect(thumbnailObjectKey("events/e1/my.photo.name.jpeg")).toBe(
      "events/e1/thumbs/my.photo.name.webp"
    );
  });
});

describe("createThumbnail", () => {
  async function testImageBuffer(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toBuffer();
  }

  it("produces a webp buffer", async () => {
    const input = await testImageBuffer(800, 600);
    const output = await createThumbnail(input);
    // WebP files start with "RIFF" then "WEBP" at byte offset 8.
    expect(output.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(output.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });

  it("downscales a wide image to the target width", async () => {
    const input = await testImageBuffer(2000, 1000);
    const output = await createThumbnail(input);
    const info = await sharp(output).metadata();
    expect(info.width).toBe(480);
  });

  it("never upscales an image narrower than the target width", async () => {
    const input = await testImageBuffer(200, 100);
    const output = await createThumbnail(input);
    const info = await sharp(output).metadata();
    expect(info.width).toBe(200);
  });
});
