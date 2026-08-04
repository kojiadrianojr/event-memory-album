import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHostAccess } from "@/lib/host-access-guard";
import { groupInvitationRows } from "@/lib/invitation-groups";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import {
  generateAccessToken,
  generateAdminToken,
  generateViewToken,
  hashAdminToken,
  hashAdminTokenLookup,
} from "@/lib/tokens";
import { generateEventCode } from "@/lib/event-code";
import { createEventSchema } from "@/lib/validations";

const DEFAULT_MOMENTS = [
  "Ceremony",
  "Cocktail Hour",
  "Reception",
  "Dance Floor",
];

async function resolveUniqueEventCode(preferred?: string): Promise<string> {
  const candidates: string[] = [];
  if (preferred) candidates.push(preferred.toUpperCase());
  for (let i = 0; i < 20; i++) candidates.push(generateEventCode());

  for (const code of candidates) {
    const existing = await db.event.findUnique({
      where: { eventCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("Could not allocate a unique event code");
}

export async function POST(request: Request) {
  const hostAccess = await requireHostAccess(request);
  if (!hostAccess.ok) return hostAccess.response;

  const rateLimited = await enforceRateLimit(request, RATE_LIMITS.createEvent);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    name,
    description,
    eventDate,
    hostName,
    accessMode,
    eventCode: requestedEventCode,
    invitations = [],
  } = parsed.data;

  const needsEventCode =
    accessMode === "EVENT_CODE" || accessMode === "BOTH";

  let eventCode: string | null = null;
  if (needsEventCode) {
    try {
      eventCode = await resolveUniqueEventCode(requestedEventCode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not allocate event code";
      const status = message.includes("unique") ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  }

  let invitationGroups;
  try {
    invitationGroups = groupInvitationRows(invitations);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid invitation list";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const accessToken = generateAccessToken();
  const viewToken = generateViewToken();
  const adminTokenPlain = generateAdminToken();
  const adminTokenHash = await hashAdminToken(adminTokenPlain);
  const adminTokenLookup = hashAdminTokenLookup(adminTokenPlain);

  const event = await db.event.create({
    data: {
      name,
      description,
      eventDate: eventDate ? new Date(eventDate) : null,
      hostName,
      accessMode,
      eventCode,
      accessToken,
      viewToken,
      adminToken: adminTokenHash,
      adminTokenLookup,
      moments: {
        create: DEFAULT_MOMENTS.map((momentName, index) => ({
          name: momentName,
          sortOrder: index,
        })),
      },
      invitations: {
        create: invitationGroups.map((group) => ({
          code: group.code,
          groupName: group.groupName,
          members: {
            create: group.members.map((m) => ({ name: m.name })),
          },
        })),
      },
    },
  });

  return NextResponse.json(
    {
      id: event.id,
      accessMode: event.accessMode,
      eventCode: event.eventCode,
      accessToken,
      viewToken,
      adminToken: adminTokenPlain,
    },
    { status: 201 }
  );
}
