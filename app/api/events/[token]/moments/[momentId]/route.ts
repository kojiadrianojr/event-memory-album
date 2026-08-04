import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateMomentsPrompts } from "@/lib/cache-invalidate";
import { findEventByAccessToken, verifyAdminForEvent } from "@/lib/event-auth";
import { momentUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; momentId: string }> }
) {
  const { token, momentId } = await params;
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

  const existing = await db.eventMoment.findFirst({
    where: { id: momentId, eventId: event.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Moment not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = momentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const moment = await db.eventMoment.update({
    where: { id: momentId },
    data: parsed.data,
  });

  await invalidateMomentsPrompts(event.id);

  return NextResponse.json(moment);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string; momentId: string }> }
) {
  const { token, momentId } = await params;
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

  const existing = await db.eventMoment.findFirst({
    where: { id: momentId, eventId: event.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Moment not found" }, { status: 404 });
  }

  await db.eventMoment.delete({ where: { id: momentId } });
  await invalidateMomentsPrompts(event.id);
  return new NextResponse(null, { status: 204 });
}
