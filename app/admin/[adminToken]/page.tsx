import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminToken, hashAdminTokenLookup } from "@/lib/tokens";
import { format } from "date-fns";
import QRCodeDisplay from "@/components/ui/QRCodeDisplay";
import CopyButton from "@/components/ui/CopyButton";
import AdminMediaGrid from "@/components/admin/AdminMediaGrid";
import AdminMomentsManager from "@/components/admin/AdminMomentsManager";
import AdminPromptsManager from "@/components/admin/AdminPromptsManager";
import AdminExportButton from "@/components/admin/AdminExportButton";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;

  const lookup = hashAdminTokenLookup(adminToken);
  let matchedId: string | null = null;

  const byLookup = await db.event.findUnique({
    where: { adminTokenLookup: lookup },
    select: { id: true, adminToken: true },
  });
  if (byLookup && (await verifyAdminToken(adminToken, byLookup.adminToken))) {
    matchedId = byLookup.id;
  }

  if (!matchedId) {
    const legacyEvents = await db.event.findMany({
      where: { adminTokenLookup: null },
      select: { id: true, adminToken: true },
    });
    for (const e of legacyEvents) {
      if (await verifyAdminToken(adminToken, e.adminToken)) {
        matchedId = e.id;
        break;
      }
    }
  }

  if (!matchedId) {
    notFound();
  }

  const event = await db.event.findUnique({
    where: { id: matchedId },
    include: {
      posts: {
        orderBy: [{ takenAt: "asc" }, { uploadedAt: "asc" }],
        include: {
          media: { orderBy: { sortOrder: "asc" } },
        },
      },
      guests: {
        orderBy: { joinedAt: "asc" },
      },
      moments: {
        orderBy: { sortOrder: "asc" },
      },
      prompts: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const uploadCounts = event.posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.uploaderName] = (acc[p.uploaderName] ?? 0) + 1;
    return acc;
  }, {});

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const guestUrl = `${baseUrl}/event/${event.accessToken}`;
  const viewUrl = `${baseUrl}/view/${event.viewToken}`;
  const adminUrl = `${baseUrl}/admin/${adminToken}`;

  const allMedia = event.posts.flatMap((p) => p.media);
  const photoCount = allMedia.filter((m) => m.type === "PHOTO").length;
  const videoCount = allMedia.filter((m) => m.type === "VIDEO").length;
  const textCount = allMedia.filter((m) => m.type === "TEXT").length;
  const audioCount = allMedia.filter((m) => m.type === "AUDIO").length;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Admin Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">
              {event.name}
            </h1>
            <p className="text-sm text-zinc-500">Host: {event.hostName}</p>
            {event.eventDate && (
              <p className="text-sm text-zinc-500">
                {format(new Date(event.eventDate), "MMMM d, yyyy")}
              </p>
            )}
            <p className="text-sm text-zinc-500 mt-1">
              Access:{" "}
              {event.accessMode === "INVITE_ONLY"
                ? "Personal invite only"
                : event.accessMode === "EVENT_CODE"
                  ? "Event code only"
                  : "Personal invite and event code"}
              {event.eventCode && (
                <>
                  {" · "}
                  Event code:{" "}
                  <span className="font-mono">{event.eventCode}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <a
              href={guestUrl}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              View Gallery →
            </a>
            <div className="flex flex-wrap gap-2 justify-end">
              <a
                href={`${baseUrl}/event/${event.accessToken}/wall`}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Guests
              </a>
              <a
                href={viewUrl}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                View-only Gallery
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{event.posts.length}</p>
            <p className="text-xs text-zinc-500">Posts</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{photoCount}</p>
            <p className="text-xs text-zinc-500">Photos</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{videoCount}</p>
            <p className="text-xs text-zinc-500">Videos</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {textCount + audioCount}
            </p>
            <p className="text-xs text-zinc-500">Stories</p>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-zinc-900">Share Event</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-zinc-500">
                Guest Upload (QR)
              </p>
              <QRCodeDisplay value={guestUrl} size={120} />
              <div className="flex items-center gap-2 w-full">
                <input
                  readOnly
                  value={guestUrl}
                  className="readonly-url-field flex-1 text-xs"
                />
                <CopyButton value={guestUrl} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-zinc-500">
                View Only (no upload)
              </p>
              <QRCodeDisplay value={viewUrl} size={120} />
              <div className="flex items-center gap-2 w-full">
                <input
                  readOnly
                  value={viewUrl}
                  className="readonly-url-field flex-1 text-xs"
                />
                <CopyButton value={viewUrl} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Admin Link</span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={adminUrl}
                className="readonly-url-field flex-1 text-xs"
              />
              <CopyButton value={adminUrl} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Export Album</h2>
          <p className="text-xs text-zinc-500">
            Download all media and metadata as a ZIP archive.
          </p>
          <AdminExportButton adminToken={adminToken} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Event Moments</h2>
          <p className="text-xs text-zinc-500">
            Chapters like Ceremony, Reception — guests can tag uploads.
          </p>
          <AdminMomentsManager
            accessToken={event.accessToken}
            adminToken={adminToken}
            initialMoments={event.moments}
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Photo Challenges
          </h2>
          <p className="text-xs text-zinc-500">
            Prompt guests to capture specific moments.
          </p>
          <AdminPromptsManager
            accessToken={event.accessToken}
            adminToken={adminToken}
            initialPrompts={event.prompts}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Posts ({event.posts.length})
          </h2>
          <AdminMediaGrid
            items={event.posts.map((p) => ({
              id: p.id,
              caption: p.caption,
              uploaderName: p.uploaderName,
              media: p.media.map((m) => ({
                id: m.id,
                url: m.url,
                type: m.type,
              })),
            }))}
            adminToken={adminToken}
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Guests ({event.guests.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {event.guests.length === 0
                  ? "No guests have joined yet."
                  : `${event.guests.length} joined · manage invite list and attendees`}
              </p>
            </div>
            <Link
              href={`/admin/${adminToken}/guests`}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Manage guests →
            </Link>
          </div>
          {event.guests.length > 0 && (
            <div className="rounded-lg border border-zinc-100 divide-y divide-zinc-100">
              {event.guests.slice(0, 5).map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-sm text-zinc-900">{guest.name}</span>
                  <span className="text-xs text-zinc-500">
                    {uploadCounts[guest.name] ?? 0}{" "}
                    {(uploadCounts[guest.name] ?? 0) === 1
                      ? "upload"
                      : "uploads"}
                  </span>
                </div>
              ))}
              {event.guests.length > 5 && (
                <p className="px-4 py-2 text-xs text-zinc-400">
                  +{event.guests.length - 5} more on the guests page
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
