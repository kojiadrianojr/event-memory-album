import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminForEvent } from "@/lib/event-auth";
import { deletePostAndStorage } from "@/lib/post-helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminToken = request.headers.get("x-admin-token");

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const media = await db.media.findUnique({
    where: { id },
    include: { post: { include: { media: true } } },
  });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const authorized = await verifyAdminForEvent(adminToken, media.eventId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await deletePostAndStorage(media.post);
  return new NextResponse(null, { status: 204 });
}
