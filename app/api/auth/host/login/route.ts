import { NextResponse } from "next/server";
import { createHostAccess } from "@/lib/host-access";
import { isHostAccessConfigured } from "@/lib/host-access-config";
import { verifyHostAccessSecret } from "@/lib/host-access-guard";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { hostAccessLoginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(
    request,
    RATE_LIMITS.hostAccessAuth
  );
  if (rateLimited) return rateLimited;

  if (!isHostAccessConfigured()) {
    return NextResponse.json(
      { error: "Host access is not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = hostAccessLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!verifyHostAccessSecret(parsed.data.secret)) {
    return NextResponse.json(
      { error: "Invalid host access secret" },
      { status: 401 }
    );
  }

  await createHostAccess();

  return NextResponse.json({ redirect: "/create" });
}
