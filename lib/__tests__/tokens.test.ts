import { describe, expect, it } from "vitest";
import {
  generateAccessToken,
  generateViewToken,
  generateAdminToken,
  hashAdminToken,
  hashAdminTokenLookup,
  verifyAdminToken,
} from "@/lib/tokens";

describe("generateAccessToken / generateViewToken", () => {
  it("produces an 8-char uppercase alphanumeric token", () => {
    const token = generateAccessToken();
    expect(token).toHaveLength(8);
    expect(token).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("produces distinct tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateViewToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("generateAdminToken", () => {
  it("produces a UUID", () => {
    const token = generateAdminToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe("hashAdminToken / verifyAdminToken", () => {
  it("round-trips a token through bcrypt hash + verify", async () => {
    const token = generateAdminToken();
    const hash = await hashAdminToken(token);
    expect(hash).not.toBe(token);
    await expect(verifyAdminToken(token, hash)).resolves.toBe(true);
  });

  it("rejects an incorrect token against a hash", async () => {
    const hash = await hashAdminToken(generateAdminToken());
    await expect(verifyAdminToken(generateAdminToken(), hash)).resolves.toBe(
      false
    );
  });
});

describe("hashAdminTokenLookup", () => {
  it("is deterministic for the same input", () => {
    const token = generateAdminToken();
    expect(hashAdminTokenLookup(token)).toBe(hashAdminTokenLookup(token));
  });

  it("differs for different inputs", () => {
    expect(hashAdminTokenLookup("a")).not.toBe(hashAdminTokenLookup("b"));
  });

  it("produces a 64-char hex sha256 digest", () => {
    expect(hashAdminTokenLookup("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
