import { NextResponse } from "next/server";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { db } from "@/lib/db";
import { findEventByAdminToken } from "@/lib/event-auth";
import { safeExportFilename } from "@/lib/export-filename";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "zip";

  if (format !== "zip") {
    return NextResponse.json(
      { error: "Only zip export is supported" },
      { status: 400 }
    );
  }

  const event = await findEventByAdminToken(adminToken);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const posts = await db.post.findMany({
    where: { eventId: event.id },
    orderBy: [{ uploadedAt: "asc" }],
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      moment: { select: { name: true } },
      prompt: { select: { text: true } },
    },
  });

  let fileIndex = 0;
  const metadata = posts.map((post, postIndex) => ({
    postIndex: postIndex + 1,
    postId: post.id,
    caption: post.caption,
    uploaderName: post.uploaderName,
    takenAt: post.takenAt?.toISOString() ?? null,
    uploadedAt: post.uploadedAt.toISOString(),
    moment: post.moment?.name ?? null,
    prompt: post.prompt?.text ?? null,
    media: post.media.map((item) => {
      const entry: {
        id: string;
        type: string;
        sortOrder: number;
        url: string | null;
        exportFile: string | null;
      } = {
        id: item.id,
        type: item.type,
        sortOrder: item.sortOrder,
        url: item.url,
        exportFile: null,
      };
      if (item.url != null) {
        fileIndex++;
        entry.exportFile = `media/${String(fileIndex).padStart(3, "0")}-${item.id}`;
      }
      return entry;
    }),
  }));

  const archive = new ZipArchive({ zlib: { level: 5 } });

  // An unhandled 'error' on the archive stream throws out of the stream machinery
  // and leaves the response hanging open with a truncated body. Destroy the stream
  // instead so the client sees the transfer end.
  archive.on("error", (err: Error) => {
    console.error("[export] archive error", err);
    archive.destroy(err);
  });
  archive.on("warning", (err: Error) => {
    console.warn("[export] archive warning", err);
  });

  archive.append(
    JSON.stringify(
      {
        event: {
          name: event.name,
          hostName: event.hostName,
          eventDate: event.eventDate?.toISOString() ?? null,
          description: event.description,
        },
        posts: metadata,
      },
      null,
      2
    ),
    { name: "metadata.json" }
  );

  void (async () => {
    fileIndex = 0;
    for (const post of posts) {
      for (const item of post.media) {
        if (!item.url) continue;
        try {
          const res = await fetch(item.url);
          if (!res.ok || !res.body) continue;
          fileIndex++;
          const ext = item.url.split(".").pop()?.split("?")[0] ?? "bin";
          archive.append(
            Readable.fromWeb(
              res.body as Parameters<typeof Readable.fromWeb>[0]
            ),
            {
              name: `media/${String(fileIndex).padStart(3, "0")}-${item.id}.${ext}`,
            }
          );
        } catch {
          // Skip files that fail to download
        }
      }
    }
    await archive.finalize();
  })().catch((err: unknown) => {
    console.error("[export] failed to build archive", err);
    archive.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const safeName = safeExportFilename(event.name);

  return new NextResponse(Readable.toWeb(archive) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}-album.zip"`,
    },
  });
}
