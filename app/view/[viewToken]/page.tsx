import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import GalleryClient from "@/app/event/[token]/GalleryClient";

export default async function ViewOnlyPage({
  params,
}: {
  params: Promise<{ viewToken: string }>;
}) {
  const { viewToken } = await params;

  const event = await db.event.findUnique({
    where: { viewToken },
    select: { id: true, name: true, eventDate: true, viewToken: true },
  });

  if (!event) {
    redirect("/?error=invalid-token");
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <p className="text-zinc-400 text-sm">Loading gallery…</p>
          </div>
        }
      >
        <GalleryClient
          token={event.viewToken}
          eventId={event.id}
          eventName={event.name}
          eventDate={event.eventDate?.toISOString() ?? null}
          readOnly
        />
      </Suspense>
    </main>
  );
}
