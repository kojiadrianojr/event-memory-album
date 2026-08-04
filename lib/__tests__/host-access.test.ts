import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isHostAccessConfigured,
  getHostAccessSecret,
} from "@/lib/host-access-config";
import {
  signHostAccess,
  verifyHostAccess,
} from "@/lib/host-access-crypto";
import { verifyHostAccessSecret } from "@/lib/host-access-guard";

const originalSecret = process.env.HOST_ACCESS_SECRET;
const originalSessionSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.HOST_ACCESS_SECRET;
  } else {
    process.env.HOST_ACCESS_SECRET = originalSecret;
  }
  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }
  vi.resetModules();
});

describe("isHostAccessConfigured", () => {
  it("returns false when HOST_ACCESS_SECRET is unset", () => {
    delete process.env.HOST_ACCESS_SECRET;
    expect(isHostAccessConfigured()).toBe(false);
    expect(getHostAccessSecret()).toBeNull();
  });

  it("returns false when HOST_ACCESS_SECRET is empty", () => {
    process.env.HOST_ACCESS_SECRET = "";
    expect(isHostAccessConfigured()).toBe(false);
  });

  it("returns true when HOST_ACCESS_SECRET is set", () => {
    process.env.HOST_ACCESS_SECRET = "test-secret";
    expect(isHostAccessConfigured()).toBe(true);
    expect(getHostAccessSecret()).toBe("test-secret");
  });
});

describe("verifyHostAccessSecret", () => {
  it("accepts the correct secret", () => {
    process.env.HOST_ACCESS_SECRET = "my-host-password";
    expect(verifyHostAccessSecret("my-host-password")).toBe(true);
  });

  it("rejects a wrong secret", () => {
    process.env.HOST_ACCESS_SECRET = "my-host-password";
    expect(verifyHostAccessSecret("wrong-password")).toBe(false);
  });

  it("rejects when secret is not configured", () => {
    delete process.env.HOST_ACCESS_SECRET;
    expect(verifyHostAccessSecret("anything")).toBe(false);
  });
});

describe("signHostAccess / verifyHostAccess", () => {
  it("round-trips a signed host access token", async () => {
    process.env.SESSION_SECRET = "test-session-secret";
    const token = await signHostAccess();
    expect(token).toContain(".");
    await expect(verifyHostAccess(token)).resolves.toEqual({ v: 1 });
  });

  it("returns null for tampered tokens", async () => {
    process.env.SESSION_SECRET = "test-session-secret";
    const token = await signHostAccess();
    await expect(verifyHostAccess(`${token}x`)).resolves.toBeNull();
  });

  it("returns null for missing tokens", async () => {
    await expect(verifyHostAccess(null)).resolves.toBeNull();
    await expect(verifyHostAccess("")).resolves.toBeNull();
  });
});
