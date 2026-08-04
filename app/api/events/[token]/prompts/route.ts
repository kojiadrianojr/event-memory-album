import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, promptsKey } from "@/lib/cache-keys";
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

  const prompts = await cachedJson(promptsKey(event.id), CACHE_TTL.prompts, () =>
    db.eventPrompt.findMany({
      where: { eventId: event.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, text: true, sortOrder: true, isActive: true },
    })
  );

  return NextResponse.json(prompts);
}
