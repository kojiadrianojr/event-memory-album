import Link from "next/link";
import GuestAvatar from "@/components/ui/GuestAvatar";

interface WallYouCardProps {
  token: string;
  guestName: string;
  isOnline?: boolean;
}

export default function WallYouCard({
  token,
  guestName,
  isOnline = false,
}: WallYouCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="relative">
        <GuestAvatar name={guestName} size="lg" />
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
            title="Online now"
            aria-label="Online now"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">
          {guestName}
        </p>
        <p className="text-xs text-zinc-500">
          You haven&apos;t posted yet
          {isOnline ? " · Online" : ""}
        </p>
      </div>
      <Link
        href={`/event/${token}/upload`}
        className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Upload
      </Link>
    </div>
  );
}
