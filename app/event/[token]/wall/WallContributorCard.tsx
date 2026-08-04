import Link from "next/link";
import GuestAvatar from "@/components/ui/GuestAvatar";

interface WallContributorCardProps {
  token: string;
  name: string;
  postCount: number;
  isCurrentGuest?: boolean;
  isOnline?: boolean;
}

export default function WallContributorCard({
  token,
  name,
  postCount,
  isCurrentGuest = false,
  isOnline = false,
}: WallContributorCardProps) {
  return (
    <Link
      href={`/event/${token}?uploader=${encodeURIComponent(name)}`}
      className={`flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
        isCurrentGuest ? "ring-2 ring-zinc-900 ring-offset-2" : ""
      }`}
    >
      <div className="relative">
        <GuestAvatar name={name} size="lg" />
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
            title="Online now"
            aria-label="Online now"
          />
        )}
      </div>
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-1.5">
          <p className="truncate text-sm font-medium leading-tight text-zinc-900">
            {name}
          </p>
          {isCurrentGuest && (
            <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {postCount} {postCount === 1 ? "post" : "posts"}
          {isOnline ? " · Online" : ""}
        </p>
      </div>
    </Link>
  );
}
