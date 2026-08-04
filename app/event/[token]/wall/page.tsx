import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWallData } from "@/lib/wall-contributors";
import WallClient from "./WallClient";

export default async function WallPage({
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

  const { contributors, summary } = await getWallData(event.id);

  return (
    <WallClient
      token={token}
      eventId={event.id}
      contributors={contributors}
      summary={summary}
    />
  );
}
