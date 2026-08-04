import { describe, expect, it } from "vitest";
import { buildContentRange, parseRangeHeader } from "@/lib/media-range";

describe("parseRangeHeader", () => {
  it("returns undefined for missing header", () => {
    expect(parseRangeHeader(null)).toBeUndefined();
  });

  it("parses bytes=start-end", () => {
    expect(parseRangeHeader("bytes=0-1023")).toBe("bytes=0-1023");
  });

  it("parses open-ended range", () => {
    expect(parseRangeHeader("bytes=1024-")).toBe("bytes=1024-");
  });

  it("rejects invalid range", () => {
    expect(parseRangeHeader("invalid")).toBeUndefined();
  });
});

describe("buildContentRange", () => {
  it("prefers S3 ContentRange when provided", () => {
    expect(buildContentRange("bytes 0-99/1000", 100, 1000)).toBe(
      "bytes 0-99/1000"
    );
  });

  it("builds full-object range when no partial metadata", () => {
    expect(buildContentRange(undefined, 500, 500)).toBe("bytes 0-499/500");
  });

  it("returns null when size unknown", () => {
    expect(buildContentRange(undefined, undefined, undefined)).toBeNull();
  });
});
