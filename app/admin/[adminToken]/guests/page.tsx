import Link from "next/link";
import { notFound } from "next/navigation";
import { findEventByAdminToken } from "@/lib/event-auth";
import { getAdminGuestManagementData } from "@/lib/admin-guests";
import AdminGuestsManager from "@/components/admin/AdminGuestsManager";

export default async function AdminGuestsPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;
  const event = await findEventByAdminToken(adminToken);

  if (!event) {
    notFound();
  }

  const data = await getAdminGuestManagementData(event.id);
  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Manage Guests
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            {data.eventName}
          </h1>
          <p className="text-sm text-zinc-500">Host: {data.hostName}</p>
          <Link
            href={`/admin/${adminToken}`}
            className="mt-3 inline-block text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Back to dashboard
          </Link>
        </div>

        <AdminGuestsManager
          adminToken={adminToken}
          accessMode={data.accessMode}
          initialInvitations={data.invitations}
          initialJoinedGuests={data.joinedGuests}
        />
      </div>
    </main>
  );
}
