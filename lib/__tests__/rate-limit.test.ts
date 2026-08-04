import { describe, expect, it } from "vitest";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

function requestFrom(ip: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("getClientIp", () => {
  it("reads the first entry of x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns unknown when neither header is present", () => {
    expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});

describe("enforceRateLimit (in-memory store)", () => {
  it("allows requests under the limit and blocks once exceeded", async () => {
    const config = { bucket: "test-under-limit", limit: 2, windowMs: 60_000 };
    const ip = "10.0.0.1";

    expect(await enforceRateLimit(requestFrom(ip), config)).toBeNull();
    expect(await enforceRateLimit(requestFrom(ip), config)).toBeNull();

    const blocked = await enforceRateLimit(requestFrom(ip), config);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("tracks separate identifiers independently", async () => {
    const config = { bucket: "test-per-ip", limit: 1, windowMs: 60_000 };

    expect(await enforceRateLimit(requestFrom("10.0.0.2"), config)).toBeNull();
    // A different IP under the same bucket should not be affected by the first.
    expect(await enforceRateLimit(requestFrom("10.0.0.3"), config)).toBeNull();
    expect(await enforceRateLimit(requestFrom("10.0.0.2"), config)).not.toBeNull();
  });
});
