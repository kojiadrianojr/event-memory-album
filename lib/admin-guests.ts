import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/invite-code";

export async function generateUniqueInviteCode(eventId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const code = generateInviteCode();
    const existing = await db.invitation.findUnique({
      where: { eventId_code: { eventId, code } },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique invite code");
}

export async function getAdminGuestManagementData(eventId: string) {
  const [event, invitations, joinedGuests, posts] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: { accessMode: true, name: true, hostName: true },
    }),
    db.invitation.findMany({
      where: { eventId },
      orderBy: [{ groupName: "asc" }, { code: "asc" }],
      include: {
        members: { orderBy: { name: "asc" } },
      },
    }),
    db.guest.findMany({
      where: { eventId },
      orderBy: { joinedAt: "asc" },
    }),
    db.post.findMany({
      where: { eventId },
      select: { uploaderName: true },
    }),
  ]);

  if (!event) return null;

  const uploadCounts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.uploaderName] = (acc[p.uploaderName] ?? 0) + 1;
    return acc;
  }, {});

  return {
    accessMode: event.accessMode,
    eventName: event.name,
    hostName: event.hostName,
    invitations: invitations.map((inv) => ({
      id: inv.id,
      code: inv.code,
      groupName: inv.groupName,
      members: inv.members.map((m) => ({ id: m.id, name: m.name })),
    })),
    joinedGuests: joinedGuests.map((g) => ({
      id: g.id,
      name: g.name,
      joinedAt: g.joinedAt.toISOString(),
      uploadCount: uploadCounts[g.name] ?? 0,
    })),
    inviteMemberCount: invitations.reduce(
      (n, inv) => n + inv.members.length,
      0
    ),
  };
}
