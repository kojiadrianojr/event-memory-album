import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import EventChrome from "@/components/event/EventChrome";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const event = await db.event.findUnique({
    where: { accessToken: token },
    select: { id: true, name: true, accessMode: true },
  });

  if (!event) {
    redirect("/?error=invalid-token");
  }

  const session = await readSession();
  if (!session || session.eventId !== event.id) {
    redirect("/?error=invalid-token");
  }

  if (session.invitationId) {
    const member = await db.invitationMember.findFirst({
      where: {
        name: session.guestName,
        invitation: { id: session.invitationId, eventId: event.id },
      },
      select: { id: true },
    });
    if (!member) {
      redirect("/?error=invalid-token");
    }
  } else {
    if (event.accessMode === "INVITE_ONLY") {
      redirect("/?error=invalid-token");
    }

    const guest = await db.guest.findUnique({
      where: {
        eventId_name: { eventId: event.id, name: session.guestName },
      },
      select: { id: true },
    });
    if (!guest) {
      redirect("/?error=invalid-token");
    }
  }

  return (
    <EventChrome token={token} eventId={event.id} eventName={event.name}>
      {children}
    </EventChrome>
  );
}
