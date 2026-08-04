import type { WallContributor, WallSummary } from "@/lib/wall-contributors";

interface WallStatsBarProps {
  summary: WallSummary;
  guestName: string | null;
  contributors: WallContributor[];
}

export default function WallStatsBar({
  summary,
  guestName,
  contributors,
}: WallStatsBarProps) {
  const guestPostCount = guestName
    ? (contributors.find((contributor) => contributor.name === guestName)
        ?.postCount ?? 0)
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
        <p className="text-2xl font-bold text-zinc-900">
          {summary.contributorCount}
        </p>
        <p className="text-xs text-zinc-500">
          {summary.contributorCount === 1 ? "Contributor" : "Contributors"}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center">
        <p className="text-2xl font-bold text-zinc-900">{summary.totalPosts}</p>
        <p className="text-xs text-zinc-500">
          {summary.totalPosts === 1 ? "Post" : "Posts"}
        </p>
      </div>
      {guestName && guestPostCount !== null && (
        <div className="col-span-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center sm:col-span-1">
          <p className="text-2xl font-bold text-zinc-900">{guestPostCount}</p>
          <p className="text-xs text-zinc-500">Your posts</p>
        </div>
      )}
    </div>
  );
}
