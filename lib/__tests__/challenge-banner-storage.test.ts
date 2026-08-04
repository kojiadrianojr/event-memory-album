import { describe, expect, it, vi } from "vitest";
import {
  challengesBannerDismissedKey,
  isChallengesBannerDismissed,
  setChallengesBannerDismissed,
} from "@/lib/challenge-banner-storage";

describe("challenge-banner-storage", () => {
  it("uses a per-event storage key", () => {
    expect(challengesBannerDismissedKey("evt-test")).toBe(
      "challengesBannerDismissed:evt-test"
    );
  });

  it("starts undismissed and persists dismiss", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    expect(isChallengesBannerDismissed("evt-test")).toBe(false);
    setChallengesBannerDismissed("evt-test");
    expect(isChallengesBannerDismissed("evt-test")).toBe(true);

    vi.unstubAllGlobals();
  });
});
