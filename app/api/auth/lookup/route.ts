import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cachedJson } from "@/lib/cache";
import { CACHE_TTL, lookupInviteKey } from "@/lib/cache-keys";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { inviteLookupSchema } from "@/lib/validations";

type InviteLookupResponse = {
  invitations: {
    invitationId: string;
    groupName: string | null;
    members: { name: string }[];
    event: { name: string; eventDate: string | null };
  }[];
};

async function fetchInviteLookup(code: string): Promise<InviteLookupResponse | null> {
  const invitations = await db.invitation.findMany({
    where: { code },
    include: {
      members: { orderBy: { name: "asc" } },
      event: { select: { name: true, eventDate: true } },
    },
    orderBy: [{ event: { eventDate: "asc" } }, { event: { name: "asc" } }],
  });

  if (invitations.length === 0) return null;

  return {
    invitations: invitations.map((invitation) => ({
      invitationId: invitation.id,
      groupName: invitation.groupName,
      members: invitation.members.map((m) => ({ name: m.name })),
      event: {
        name: invitation.event.name,
        eventDate: invitation.event.eventDate?.toISOString() ?? null,
      },
    })),
  };
}

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.inviteAuth);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const code = parsed.data.code;
  const result = await cachedJson(
    lookupInviteKey(code),
    CACHE_TTL.lookup,
    () => fetchInviteLookup(code)
  );

  if (!result) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
