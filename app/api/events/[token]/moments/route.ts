import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, momentsKey } from "@/lib/cache-keys";
import { findEventByGuestOrViewToken } from "@/lib/event-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await findEventByGuestOrViewToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const moments = await cachedJson(momentsKey(event.id), CACHE_TTL.moments, () =>
    db.eventMoment.findMany({
      where: { eventId: event.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    })
  );

  return NextResponse.json(moments);
}
