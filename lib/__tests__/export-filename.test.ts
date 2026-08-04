import { describe, expect, it } from "vitest";
import { safeExportFilename } from "@/lib/export-filename";

describe("safeExportFilename", () => {
  it("lowercases and collapses non-alphanumeric runs into a single dash", () => {
    expect(safeExportFilename("Alex & Sam's Wedding!")).toBe(
      "alex-sam-s-wedding-"
    );
  });

  it("leaves already-safe names unchanged apart from casing", () => {
    expect(safeExportFilename("Summer2026")).toBe("summer2026");
  });

  it("never throws on an empty string", () => {
    expect(safeExportFilename("")).toBe("");
  });
});
