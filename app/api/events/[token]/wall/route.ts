import { NextResponse } from "next/server";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, wallKey } from "@/lib/cache-keys";
import { findEventByGuestOrViewToken } from "@/lib/event-auth";
import { getWallData } from "@/lib/wall-contributors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await findEventByGuestOrViewToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const data = await cachedJson(wallKey(event.id), CACHE_TTL.wall, () =>
    getWallData(event.id)
  );

  return NextResponse.json(data);
}
