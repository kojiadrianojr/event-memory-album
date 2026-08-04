"use client";

import { useState } from "react";
import { Reaction } from "@/components/gallery/types";
import {
  countFor,
  hasReacted,
  reactorSummaryLabel,
  REACTION_EMOJIS,
  totalReactionCount,
} from "@/lib/reactions";
import { useReactionViewerTriggerController } from "@/lib/use-reaction-viewer-trigger";
import ReactionReactorsSheet from "./ReactionReactorsSheet";

interface ReactionBarProps {
  token: string;
  postId: string;
  reactions: Reaction[];
  guestName: string;
  onReactionsChange: (updated: Reaction[]) => void;
  variant?: "light" | "dark";
  layout?: "bar" | "feed";
  compact?: boolean;
  readOnly?: boolean;
}

export default function ReactionBar({
  token,
  postId,
  reactions,
  guestName,
  onReactionsChange,
  variant = "light",
  layout = "bar",
  compact = false,
  readOnly = false,
}: ReactionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [reactorsOpen, setReactorsOpen] = useState(false);
  const [filterEmoji, setFilterEmoji] = useState<string | undefined>();

  const { getTriggerProps } = useReactionViewerTriggerController();

  async function toggle(emoji: string) {
    if (readOnly || loading) return;
    setLoading(emoji);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, postId, emoji, guestName }),
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.toggled === "added") {
        onReactionsChange([
          ...reactions,
          {
            id: data.id,
            postId,
            emoji,
            guestName,
            createdAt: data.createdAt,
          },
        ]);
      } else {
        onReactionsChange(
          reactions.filter(
            (r) => !(r.emoji === emoji && r.guestName === guestName)
          )
        );
      }
    } finally {
      setLoading(null);
    }
  }

  function openReactors(emoji?: string) {
    setFilterEmoji(emoji);
    setReactorsOpen(true);
  }

  const totalCount = totalReactionCount(reactions);
  const summary = reactorSummaryLabel(reactions);
  const summaryTrigger = getTriggerProps("summary", () => openReactors());

  function countButtonClasses(active: boolean): string {
    const base =
      layout === "feed"
        ? compact
          ? "min-h-[14px] min-w-[14px] rounded-full px-1 text-[9px] font-semibold leading-none touch-manipulation"
          : "min-h-[16px] min-w-[16px] rounded-full px-1.5 text-[10px] font-semibold leading-none touch-manipulation"
        : "min-w-[1.25rem] px-2 py-1 text-xs font-medium touch-manipulation";

    if (layout === "feed") {
      return `${base} ${
        variant === "dark"
          ? "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          : active
            ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`;
    }

    return `${base} hover:underline ${countClasses(active)}`;
  }

  function summaryClasses(): string {
    if (variant === "dark") {
      return "text-zinc-300 hover:text-white";
    }
    return "text-zinc-500 hover:text-zinc-800";
  }

  function barPillClasses(active: boolean): string {
    if (variant === "dark") {
      return active
        ? "border-zinc-400 bg-zinc-800 text-white"
        : "border-zinc-600 bg-zinc-900/80 text-zinc-200 hover:border-zinc-400";
    }
    return active
      ? "border-zinc-700 bg-zinc-900 text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400";
  }

  function feedItemClasses(active: boolean): string {
    if (variant === "dark") {
      return active ? "bg-zinc-800" : "hover:bg-zinc-900";
    }
    return active ? "bg-zinc-100" : "hover:bg-zinc-50";
  }

  function countClasses(active: boolean): string {
    if (layout === "feed") {
      return active ? "text-zinc-700" : "text-zinc-300";
    }
    return "text-xs font-medium";
  }

  return (
    <>
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <div
          className={
            layout === "feed"
              ? compact
                ? "flex w-full items-center justify-start gap-1"
                : "flex w-max min-w-full items-center justify-between gap-0.5 sm:justify-start sm:gap-1"
              : "flex w-max min-w-full flex-nowrap items-center gap-1.5"
          }
        >
        {REACTION_EMOJIS.map((emoji) => {
          const count = countFor(reactions, emoji);
          const active = hasReacted(reactions, emoji, guestName);
          const countTrigger = getTriggerProps(`count-${emoji}`, () =>
            openReactors(emoji)
          );

          if (layout === "feed") {
            return (
              <div
                key={emoji}
                className={`flex shrink-0 flex-col items-center select-none ${
                  compact
                    ? "min-w-[2.25rem] gap-0 rounded-lg px-0.5 py-0.5"
                    : "min-w-[48px] gap-0.5 rounded-xl px-1 py-1.5"
                } ${feedItemClasses(active)}`}
              >
                {readOnly ? (
                  <span
                    className={`leading-none ${compact ? "text-lg" : "text-[22px]"}`}
                  >
                    {emoji}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(emoji)}
                    disabled={loading === emoji}
                    aria-label={`React with ${emoji}`}
                    className={`touch-manipulation leading-none transition-all active:scale-90 disabled:opacity-40 ${
                      compact ? "text-lg" : "text-[22px]"
                    }`}
                  >
                    {emoji}
                  </button>
                )}
                {count > 0 ? (
                  <button
                    type="button"
                    {...countTrigger.triggerProps}
                    className={`${countButtonClasses(active)} transition-transform ${countTrigger.pressClass}`}
                    aria-label={`View ${count} ${emoji} reactions`}
                    aria-haspopup="dialog"
                  >
                    {count}
                  </button>
                ) : (
                  <span
                    className={`text-[10px] leading-none ${
                      compact ? "min-h-[10px]" : "min-h-[12px]"
                    }`}
                  />
                )}
              </div>
            );
          }

          return (
            <div
              key={emoji}
              className={`flex shrink-0 items-center rounded-full border transition-colors ${barPillClasses(active)}`}
            >
              {readOnly ? (
                <span className="px-2 py-1 text-sm">{emoji}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(emoji)}
                  disabled={loading === emoji}
                  aria-label={`React with ${emoji}`}
                  className="px-2 py-1 text-sm disabled:opacity-50"
                >
                  {emoji}
                </button>
              )}
              {count > 0 && (
                <button
                  type="button"
                  {...countTrigger.triggerProps}
                  aria-label={`View ${count} ${emoji} reactions`}
                  aria-haspopup="dialog"
                  className={`border-l disabled:opacity-50 transition-transform ${countTrigger.pressClass} ${
                    variant === "dark" ? "border-zinc-600" : "border-zinc-200"
                  } ${countButtonClasses(active)}`}
                >
                  {count}
                </button>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {totalCount > 0 && summary && (
        <button
          type="button"
          {...summaryTrigger.triggerProps}
          className={`${compact ? "mt-1" : "mt-1.5"} block max-w-full truncate text-left text-xs font-medium touch-manipulation transition-transform ${summaryTrigger.pressClass} ${summaryClasses()}`}
          aria-label={`View all ${totalCount} reactions`}
          aria-haspopup="dialog"
          title={summary}
        >
          {summary}
        </button>
      )}

      <ReactionReactorsSheet
        key={reactorsOpen ? (filterEmoji ?? "ALL") : "closed"}
        open={reactorsOpen}
        onClose={() => setReactorsOpen(false)}
        reactions={reactions}
        filterEmoji={filterEmoji}
      />
    </>
  );
}
