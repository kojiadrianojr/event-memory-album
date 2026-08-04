import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateInviteLookup } from "@/lib/cache-invalidate";
import { findEventByAdminToken } from "@/lib/event-auth";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ adminToken: string; invitationId: string }> }
) {
  const { adminToken, invitationId } = await params;
  const event = await findEventByAdminToken(adminToken);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.accessMode === "EVENT_CODE") {
    return NextResponse.json(
      { error: "This event uses event-code access only; invite list is disabled" },
      { status: 400 }
    );
  }

  const invitation = await db.invitation.findFirst({
    where: { id: invitationId, eventId: event.id },
    select: { id: true, code: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 });
  }

  await db.invitation.delete({ where: { id: invitationId } });
  await invalidateInviteLookup(invitation.code);

  return new NextResponse(null, { status: 204 });
}
