import { NextResponse } from "next/server";
import { clearHostAccess } from "@/lib/host-access";

export async function POST() {
  await clearHostAccess();
  return NextResponse.json({ ok: true });
}
