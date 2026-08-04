import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import GalleryClient from "./GalleryClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const event = await db.event.findUnique({
    where: { accessToken: token },
    select: { id: true, name: true, eventDate: true },
  });

  if (!event) {
    redirect("/?error=invalid-token");
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <p className="text-zinc-400 text-sm">Loading gallery…</p>
        </div>
      }
    >
      <GalleryClient
        token={token}
        eventId={event.id}
        eventName={event.name}
        eventDate={event.eventDate?.toISOString() ?? null}
      />
    </Suspense>
  );
}
