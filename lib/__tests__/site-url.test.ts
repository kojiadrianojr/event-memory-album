import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteSiteUrl, getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_WEBSITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://snaps.arkea.tech/");
    vi.stubEnv("WEBSITE_URL", "https://ignored.example");
    expect(getSiteUrl()).toBe("https://snaps.arkea.tech");
  });

  it("falls back to WEBSITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", undefined);
    vi.stubEnv("WEBSITE_URL", "https://snaps.arkea.tech");
    expect(getSiteUrl()).toBe("https://snaps.arkea.tech");
  });

  it("falls back to localhost", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("absoluteSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds event links from the configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://snaps.arkea.tech");
    expect(absoluteSiteUrl("/event/ABC12345")).toBe(
      "https://snaps.arkea.tech/event/ABC12345"
    );
  });
});
