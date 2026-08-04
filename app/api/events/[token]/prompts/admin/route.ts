import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateMomentsPrompts } from "@/lib/cache-invalidate";
import { findEventByAccessToken, verifyAdminForEvent } from "@/lib/event-auth";
import { promptSchema } from "@/lib/validations";

export async function GET(
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

  const prompts = await db.eventPrompt.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(prompts);
}

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

  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await db.eventPrompt.count({ where: { eventId: event.id } });

  const prompt = await db.eventPrompt.create({
    data: {
      eventId: event.id,
      text: parsed.data.text,
      sortOrder: parsed.data.sortOrder ?? count,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await invalidateMomentsPrompts(event.id);

  return NextResponse.json(prompt, { status: 201 });
}
