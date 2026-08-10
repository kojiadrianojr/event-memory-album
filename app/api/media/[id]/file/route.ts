import { NextResponse } from "next/server";
import { parseRangeHeader } from "@/lib/media-range";
import {
  ensureLargeVariant,
  getMediaForFileRoute,
  resolveMediaSourceUrl,
  type MediaFileVariant,
} from "@/lib/media-file-cache";
import { mimeFromUrl } from "@/lib/mime-from-url";
import { getObject, objectKeyFromPublicUrl } from "@/lib/s3";

function contentTypeForMedia(
  url: string,
  type: "PHOTO" | "VIDEO" | "AUDIO" | "TEXT"
): string {
  if (type === "TEXT") return "text/plain";
  if (type === "VIDEO") return mimeFromUrl(url, "video", "video/mp4");
  if (type === "AUDIO") return mimeFromUrl(url, "audio", "audio/mpeg");
  return mimeFromUrl(url, "image", "image/jpeg");
}

function parseVariantParam(raw: string | null): MediaFileVariant {
  if (raw === "thumb") return "thumb";
  if (raw === "large") return "large";
  return "original";
}

// Intentionally unauthenticated: `id` is an unguessable cuid, and the storage
// bucket behind it is already public (`mc anonymous set public` in
// docker-compose.yml / equivalent public R2 config in prod) so the underlying
// object is reachable directly regardless of what this route does. This proxy
// exists for a stable same-origin URL + a thumb/full variant switch, not access
// control — access control lives in the event/view/admin token model instead.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = parseVariantParam(
    new URL(request.url).searchParams.get("variant")
  );

  let media = await getMediaForFileRoute(id);
  if (!media?.url) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  if (variant === "large" && media.type === "PHOTO" && !media.largeUrl) {
    media = await ensureLargeVariant(media);
  }

  // Fall back to the full-size image when no thumbnail/large variant exists
  // (videos/audio, text, or photos uploaded before variants existed).
  const sourceUrl = resolveMediaSourceUrl(media, variant);
  if (!sourceUrl) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const objectKey = objectKeyFromPublicUrl(sourceUrl);
  if (!objectKey) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const range = parseRangeHeader(request.headers.get("Range"));

  try {
    const result = await getObject(objectKey, range);
    if (!result.Body) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const contentType =
      result.ContentType ?? contentTypeForMedia(sourceUrl, media.type);

    const isPartial = Boolean(result.ContentRange);
    const contentRange = result.ContentRange ?? null;

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };

    if (result.ContentLength != null) {
      headers["Content-Length"] = String(result.ContentLength);
    }
    if (contentRange) {
      headers["Content-Range"] = contentRange;
    }

    return new NextResponse(result.Body.transformToWebStream(), {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
}
