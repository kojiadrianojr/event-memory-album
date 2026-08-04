import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { inviteLoginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.inviteAuth);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { invitationId, guestName } = parsed.data;

  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    include: {
      members: true,
      event: { select: { id: true, accessToken: true } },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const member = invitation.members.find((m) => m.name === guestName);
  if (!member) {
    return NextResponse.json(
      { error: "Name does not match this invite code" },
      { status: 403 }
    );
  }

  // Record the guest as joined (mirrors the existing Guest-name flow).
  await db.guest.upsert({
    where: {
      eventId_name: { eventId: invitation.eventId, name: member.name },
    },
    update: {},
    create: { eventId: invitation.eventId, name: member.name },
  });

  await createSession({
    eventId: invitation.eventId,
    invitationId: invitation.id,
    guestName: member.name,
  });

  return NextResponse.json({
    redirect: `/event/${invitation.event.accessToken}`,
    guestName: member.name,
    eventId: invitation.eventId,
  });
}
