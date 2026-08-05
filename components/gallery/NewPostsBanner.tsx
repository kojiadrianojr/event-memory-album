"use client";

interface NewPostsBannerProps {
  count: number;
  onLoad: () => void;
  hasStickyHeader?: boolean;
}

function postLabel(count: number): string {
  return count === 1 ? "1 new post" : `${count} new posts`;
}

export default function NewPostsBanner({
  count,
  onLoad,
  hasStickyHeader = true,
}: NewPostsBannerProps) {
  if (count <= 0) return null;

  return (
    <div
      className={`sticky z-20 flex justify-center px-4 ${
        hasStickyHeader ? "top-14" : "top-2"
      }`}
    >
      <button
        type="button"
        onClick={onLoad}
        className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
      >
        {postLabel(count)} — tap to view
      </button>
    </div>
  );
}
