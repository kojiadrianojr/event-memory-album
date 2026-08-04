import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, lookupEventCodeKey } from "@/lib/cache-keys";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { eventCodeLoginSchema } from "@/lib/validations";

type EventCodeEvent = {
  id: string;
  accessToken: string;
  accessMode: "INVITE_ONLY" | "EVENT_CODE" | "BOTH";
};

async function findEventByEventCode(
  normalizedCode: string
): Promise<EventCodeEvent | null> {
  return cachedJson(lookupEventCodeKey(normalizedCode), CACHE_TTL.event, () =>
    db.event.findUnique({
      where: { eventCode: normalizedCode },
      select: {
        id: true,
        accessToken: true,
        accessMode: true,
      },
    })
  );
}

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.inviteAuth);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventCodeLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { code, guestName } = parsed.data;
  const normalizedCode = code.trim().toUpperCase();

  const event = await findEventByEventCode(normalizedCode);

  if (!event) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  if (event.accessMode === "INVITE_ONLY") {
    return NextResponse.json(
      { error: "This event requires a personal invite code" },
      { status: 403 }
    );
  }

  await db.guest.upsert({
    where: {
      eventId_name: { eventId: event.id, name: guestName },
    },
    update: {},
    create: { eventId: event.id, name: guestName },
  });

  await createSession({
    eventId: event.id,
    invitationId: null,
    guestName,
  });

  return NextResponse.json({
    redirect: `/event/${event.accessToken}`,
    guestName,
    eventId: event.id,
  });
}
