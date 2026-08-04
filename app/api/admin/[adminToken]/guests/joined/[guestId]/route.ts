import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findEventByAdminToken } from "@/lib/event-auth";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ adminToken: string; guestId: string }> }
) {
  const { adminToken, guestId } = await params;
  const event = await findEventByAdminToken(adminToken);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const guest = await db.guest.findFirst({
    where: { id: guestId, eventId: event.id },
    select: { id: true },
  });

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  await db.guest.delete({ where: { id: guestId } });
  return new NextResponse(null, { status: 204 });
}
