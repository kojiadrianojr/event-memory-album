import { describe, expect, it } from "vitest";
import { shortPromptLabel } from "@/lib/prompt-label";

describe("shortPromptLabel", () => {
  it("returns short text unchanged", () => {
    expect(shortPromptLabel("Selfie with bride")).toBe("Selfie with bride");
  });

  it("truncates long text at a word boundary", () => {
    const text = "Take a selfie with the bride and groom at the altar";
    const label = shortPromptLabel(text);
    expect(label.endsWith("…")).toBe(true);
    expect(label.length).toBeLessThanOrEqual(29);
    expect(label).not.toContain("altar");
  });
});
