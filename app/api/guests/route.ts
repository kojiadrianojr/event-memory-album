import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAccessTokenForEvent } from "@/lib/event-auth";
import { guestNameSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = guestNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, name, eventId } = parsed.data;

  const authorized = await verifyAccessTokenForEvent(token, eventId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const guest = await db.guest.upsert({
    where: { eventId_name: { eventId, name } },
    create: { eventId, name },
    update: {},
  });

  return NextResponse.json(guest, { status: 201 });
}
