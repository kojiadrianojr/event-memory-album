import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { putObject } from "@/lib/s3";
import { getS3UploadMode } from "@/lib/s3-upload-mode";
import { presignedUrlSchema } from "@/lib/validations";

/** Max upload size for proxied PUTs (100 MB). */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  if (getS3UploadMode() !== "direct") {
    return NextResponse.json({ error: "Direct upload is disabled" }, { status: 403 });
  }

  const rateLimited = await enforceRateLimit(
    request,
    RATE_LIMITS.presignedUpload
  );
  if (rateLimited) return rateLimited;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const token = formData.get("token");
  const mimeType = formData.get("mimeType");
  const filename = formData.get("filename");

  const parsed = presignedUrlSchema.safeParse({
    filename: typeof filename === "string" ? filename : file instanceof File ? file.name : "",
    mimeType: typeof mimeType === "string" ? mimeType : file instanceof File ? file.type : "",
    token,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File exceeds maximum upload size (100 MB)." },
      { status: 413 }
    );
  }

  const { filename: parsedFilename, mimeType: parsedMimeType, token: parsedToken } =
    parsed.data;

  const event = await db.event.findUnique({
    where: { accessToken: parsedToken },
  });

  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const ext = path.extname(parsedFilename).toLowerCase();
  const objectKey = `events/${event.id}/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await putObject(objectKey, buffer, parsedMimeType);

  return NextResponse.json({ objectKey, eventId: event.id });
}
