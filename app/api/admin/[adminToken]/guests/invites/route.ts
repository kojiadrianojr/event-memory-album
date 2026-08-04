import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateUniqueInviteCode } from "@/lib/admin-guests";
import { invalidateInviteLookup } from "@/lib/cache-invalidate";
import { findEventByAdminToken } from "@/lib/event-auth";
import { adminAddInviteGuestSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminAddInviteGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const guestNames = [...new Set(parsed.data.guestNames.map((n) => n.trim()))];
  const { groupName } = parsed.data;
  const code = parsed.data.code?.toUpperCase();
  const trimmedGroup = groupName?.trim() || null;

  let invitation = code
    ? await db.invitation.findUnique({
        where: { eventId_code: { eventId: event.id, code } },
        include: { members: true },
      })
    : null;

  if (code && !invitation) {
    invitation = await db.invitation.create({
      data: {
        eventId: event.id,
        code,
        groupName: trimmedGroup,
        members: { create: guestNames.map((name) => ({ name })) },
      },
      include: { members: true },
    });
  } else if (invitation) {
    if (
      trimmedGroup &&
      invitation.groupName &&
      invitation.groupName !== trimmedGroup
    ) {
      return NextResponse.json(
        { error: "Group name does not match this invite code" },
        { status: 409 }
      );
    }

    const duplicate = guestNames.find((name) =>
      invitation!.members.some((m) => m.name === name)
    );
    if (duplicate) {
      return NextResponse.json(
        { error: `${duplicate} is already on the invite list for this code` },
        { status: 409 }
      );
    }

    await db.invitationMember.createMany({
      data: guestNames.map((name) => ({
        invitationId: invitation!.id,
        name,
      })),
    });

    if (trimmedGroup && !invitation.groupName) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { groupName: trimmedGroup },
      });
      invitation.groupName = trimmedGroup;
    }

    invitation = await db.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
      include: { members: true },
    });
  } else {
    const newCode = await generateUniqueInviteCode(event.id);
    invitation = await db.invitation.create({
      data: {
        eventId: event.id,
        code: newCode,
        groupName: trimmedGroup,
        members: { create: guestNames.map((name) => ({ name })) },
      },
      include: { members: true },
    });
  }

  await invalidateInviteLookup(invitation.code);

  return NextResponse.json(
    {
      invitation: {
        id: invitation.id,
        code: invitation.code,
        groupName: invitation.groupName,
        members: invitation.members.map((m) => ({ id: m.id, name: m.name })),
      },
    },
    { status: 201 }
  );
}
