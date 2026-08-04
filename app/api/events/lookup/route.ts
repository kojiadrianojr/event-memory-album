import { NextResponse } from "next/server";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, lookupViewKey } from "@/lib/cache-keys";
import { findEventByViewToken } from "@/lib/event-auth";
import { accessTokenSchema } from "@/lib/validations";

/** Resolve a view-only token to its gallery URL. Upload access uses event-code auth instead. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const parsed = accessTokenSchema.safeParse(code?.trim().toUpperCase());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const token = parsed.data;

  const redirect = await cachedJson(
    lookupViewKey(token),
    CACHE_TTL.lookup,
    async () => {
      const event = await findEventByViewToken(token);
      return event ? `/view/${token}` : null;
    }
  );

  if (!redirect) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ redirect });
}
