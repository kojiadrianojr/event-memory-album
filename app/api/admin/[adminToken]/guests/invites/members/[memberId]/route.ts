import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateInviteLookup } from "@/lib/cache-invalidate";
import { findEventByAdminToken } from "@/lib/event-auth";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ adminToken: string; memberId: string }> }
) {
  const { adminToken, memberId } = await params;
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

  const member = await db.invitationMember.findFirst({
    where: {
      id: memberId,
      invitation: { eventId: event.id },
    },
    select: { id: true, invitationId: true, invitation: { select: { code: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const inviteCode = member.invitation.code;

  await db.invitationMember.delete({ where: { id: memberId } });

  const remaining = await db.invitationMember.count({
    where: { invitationId: member.invitationId },
  });
  if (remaining === 0) {
    await db.invitation.delete({ where: { id: member.invitationId } });
  }

  await invalidateInviteLookup(inviteCode);

  return new NextResponse(null, { status: 204 });
}
