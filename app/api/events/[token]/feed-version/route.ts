import { NextResponse } from "next/server";
import { cacheProbeVersion } from "@/lib/cache";
import { feedVersionKey } from "@/lib/cache-keys";
import { findEventByGuestOrViewToken } from "@/lib/event-auth";

export const dynamic = "force-dynamic";

/**
 * Cheap change-detection endpoint for the live feed. Clients poll this and only
 * refetch the (much larger) feed when `version` changes.
 *
 * `live` is false when Redis is unavailable — the version counter is then stuck
 * at 0 and can never signal a change, so clients must fall back to interval
 * refetching instead.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await findEventByGuestOrViewToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const version = await cacheProbeVersion(feedVersionKey(event.id));

  return NextResponse.json(
    { version: version ?? 0, live: version !== null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
