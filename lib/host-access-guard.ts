import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isHostAccessConfigured, getHostAccessSecret } from "@/lib/host-access-config";
import { verifyHostAccess } from "@/lib/host-access-crypto";

/** Constant-time compare of the provided secret against the configured value. */
export function verifyHostAccessSecret(input: string): boolean {
  const expected = getHostAccessSecret();
  if (!expected) return false;

  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(inputBuf, expectedBuf);
}

/** Guard for route handlers — requires configured secret and valid host cookie. */
export async function requireHostAccess(
  request: Request
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!isHostAccessConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Host access is not configured" },
        { status: 403 }
      ),
    };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)host_access=([^;]*)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  const payload = await verifyHostAccess(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Host access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
