import { NextResponse } from "next/server";
import { findEventByAdminToken } from "@/lib/event-auth";
import { getAdminGuestManagementData } from "@/lib/admin-guests";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const event = await findEventByAdminToken(adminToken);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const data = await getAdminGuestManagementData(event.id);
  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
