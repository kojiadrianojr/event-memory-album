import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateMomentsPrompts } from "@/lib/cache-invalidate";
import { findEventByAccessToken, verifyAdminForEvent } from "@/lib/event-auth";
import { momentSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const adminToken = request.headers.get("x-admin-token");

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await findEventByAccessToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const authorized = await verifyAdminForEvent(adminToken, event.id);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = momentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await db.eventMoment.count({ where: { eventId: event.id } });

  const moment = await db.eventMoment.create({
    data: {
      eventId: event.id,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? count,
    },
  });

  await invalidateMomentsPrompts(event.id);

  return NextResponse.json(moment, { status: 201 });
}
