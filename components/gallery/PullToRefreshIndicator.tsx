"use client";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullThreshold: number;
  isRefreshing: boolean;
  hasStickyHeader?: boolean;
}

export default function PullToRefreshIndicator({
  pullDistance,
  pullThreshold,
  isRefreshing,
  hasStickyHeader = true,
}: PullToRefreshIndicatorProps) {
  const visible = isRefreshing || pullDistance > 0;
  if (!visible) return null;

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const ready = pullDistance >= pullThreshold;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-20 flex justify-center ${
        hasStickyHeader ? "top-14" : "top-2"
      }`}
      aria-hidden={!visible}
    >
      <div
        className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur-sm transition-opacity"
        style={{ opacity: isRefreshing ? 1 : 0.4 + progress * 0.6 }}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-600 ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={
            isRefreshing
              ? undefined
              : { transform: `rotate(${progress * 360}deg)` }
          }
        />
        <span>
          {isRefreshing
            ? "Refreshing…"
            : ready
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
