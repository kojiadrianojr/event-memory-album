import { describe, expect, it } from "vitest";
import { createPostSchema } from "@/lib/validations";
import { MAX_PHOTOS_PER_POST } from "@/lib/upload-limits";

const basePayload = {
  token: "ABCD1234",
  eventId: "evt_1",
  uploaderName: "Alex",
  items: [
    {
      objectKey: "events/evt_1/photo1.jpg",
      type: "PHOTO" as const,
    },
  ],
};

describe("createPostSchema", () => {
  it("accepts up to MAX_PHOTOS_PER_POST items", () => {
    const items = Array.from({ length: MAX_PHOTOS_PER_POST }, (_, i) => ({
      objectKey: `events/evt_1/photo${i}.jpg`,
      type: "PHOTO" as const,
    }));

    const result = createPostSchema.safeParse({ ...basePayload, items });
    expect(result.success).toBe(true);
  });

  it("rejects more than MAX_PHOTOS_PER_POST items", () => {
    const items = Array.from({ length: MAX_PHOTOS_PER_POST + 1 }, (_, i) => ({
      objectKey: `events/evt_1/photo${i}.jpg`,
      type: "PHOTO" as const,
    }));

    const result = createPostSchema.safeParse({ ...basePayload, items });
    expect(result.success).toBe(false);
  });

  it("rejects objectKeys from a different event", () => {
    const result = createPostSchema.safeParse({
      ...basePayload,
      items: [{ objectKey: "events/other/photo.jpg", type: "PHOTO" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional thumbnailObjectKey on video items", () => {
    const result = createPostSchema.safeParse({
      ...basePayload,
      items: [
        {
          objectKey: "events/evt_1/video.mp4",
          type: "VIDEO",
          thumbnailObjectKey: "events/evt_1/video-poster.jpg",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
