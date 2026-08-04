import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import UploadClient from "./UploadClient";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const event = await db.event.findUnique({
    where: { accessToken: token },
    select: { id: true },
  });

  if (!event) {
    redirect("/?error=invalid-token");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <UploadClient token={token} eventId={event.id} />
    </Suspense>
  );
}
