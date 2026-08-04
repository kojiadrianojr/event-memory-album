import { describe, expect, it } from "vitest";
import {
  MAX_SKIP_BYTES,
  MAX_SKIP_EDGE,
  shouldCompressVideo,
  type VideoMeta,
} from "@/lib/video-transcode";

function mockFile(type: string, size: number): File {
  return { type, size } as File;
}

function meta(width: number, height: number): VideoMeta {
  return { width, height, duration: 10 };
}

describe("shouldCompressVideo", () => {
  it("skips small mp4 within size and resolution limits", () => {
    const file = mockFile("video/mp4", MAX_SKIP_BYTES);
    expect(shouldCompressVideo(file, meta(MAX_SKIP_EDGE, 720))).toBe(false);
  });

  it("compresses non-mp4 formats", () => {
    const file = mockFile("video/quicktime", 1024);
    expect(shouldCompressVideo(file, meta(640, 480))).toBe(true);
  });

  it("compresses webm", () => {
    const file = mockFile("video/webm", 1024);
    expect(shouldCompressVideo(file, meta(640, 480))).toBe(true);
  });

  it("compresses mp4 over max skip bytes", () => {
    const file = mockFile("video/mp4", MAX_SKIP_BYTES + 1);
    expect(shouldCompressVideo(file, meta(640, 480))).toBe(true);
  });

  it("compresses when width exceeds max edge", () => {
    const file = mockFile("video/mp4", 1024);
    expect(shouldCompressVideo(file, meta(MAX_SKIP_EDGE + 1, 720))).toBe(true);
  });

  it("compresses when height exceeds max edge", () => {
    const file = mockFile("video/mp4", 1024);
    expect(shouldCompressVideo(file, meta(720, MAX_SKIP_EDGE + 1))).toBe(true);
  });

  it("skips compress when probe fails for in-limit mp4", () => {
    const file = mockFile("video/mp4", 1024);
    expect(shouldCompressVideo(file, null)).toBe(false);
  });

  it("skips mp4 exactly at max edge and max bytes", () => {
    const file = mockFile("video/mp4", MAX_SKIP_BYTES);
    expect(shouldCompressVideo(file, meta(MAX_SKIP_EDGE, MAX_SKIP_EDGE))).toBe(
      false
    );
  });

  it("skips mp4 by extension when browser omits mime type", () => {
    const file = { type: "", size: 1024, name: "clip.mp4" } as File;
    expect(shouldCompressVideo(file, meta(640, 480))).toBe(false);
  });
});
