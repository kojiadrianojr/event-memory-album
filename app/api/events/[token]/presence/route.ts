import { NextResponse } from "next/server";
import { z } from "zod";
import { findEventByAccessToken } from "@/lib/event-auth";
import { listPresence, recordPresence } from "@/lib/presence";

const presenceSchema = z.object({
  guestName: z.string().min(1).max(100),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await findEventByAccessToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const online = await listPresence(event.id);
  return NextResponse.json({ online });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await findEventByAccessToken(token);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = presenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await recordPresence(event.id, parsed.data.guestName.trim());
  return NextResponse.json({ ok: true });
}
