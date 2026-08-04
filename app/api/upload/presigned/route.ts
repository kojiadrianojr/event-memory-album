import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { createPresignedPutUrl } from "@/lib/s3";
import { presignedUrlSchema } from "@/lib/validations";
import { randomUUID } from "crypto";
import path from "path";

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(
    request,
    RATE_LIMITS.presignedUpload
  );
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = presignedUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { filename, mimeType, token } = parsed.data;

  const event = await db.event.findUnique({
    where: { accessToken: token },
  });

  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const objectKey = `events/${event.id}/${randomUUID()}${ext}`;

  const presignedUrl = await createPresignedPutUrl(objectKey, mimeType);

  return NextResponse.json({ presignedUrl, objectKey, eventId: event.id });
}
