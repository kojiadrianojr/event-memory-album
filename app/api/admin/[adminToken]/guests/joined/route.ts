import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findEventByAdminToken } from "@/lib/event-auth";
import { adminAddJoinedGuestSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const event = await findEventByAdminToken(adminToken);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminAddJoinedGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  const existing = await db.guest.findUnique({
    where: { eventId_name: { eventId: event.id, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A guest with this name already exists" },
      { status: 409 }
    );
  }

  const guest = await db.guest.create({
    data: { eventId: event.id, name },
  });

  return NextResponse.json(
    {
      id: guest.id,
      name: guest.name,
      joinedAt: guest.joinedAt.toISOString(),
      uploadCount: 0,
    },
    { status: 201 }
  );
}
