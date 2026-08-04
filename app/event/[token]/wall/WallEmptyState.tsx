import Link from "next/link";

interface WallEmptyStateProps {
  token: string;
}

export default function WallEmptyState({ token }: WallEmptyStateProps) {
  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="8" r="3.25" />
          <circle cx="16.5" cy="9.5" r="2.75" />
          <path d="M4.5 18.5c1.2-2.8 3.1-4 5-4s3.8 1.2 5 4" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">No posts yet</p>
        <p className="text-sm text-zinc-500">
          Be the first to share a memory!
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href={`/event/${token}/upload`}
          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Share a memory
        </Link>
        <Link
          href={`/event/${token}`}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Browse gallery
        </Link>
      </div>
    </div>
  );
}
