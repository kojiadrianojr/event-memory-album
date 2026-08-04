"use client";

import { useEffect, useRef, useState } from "react";
import { Reaction } from "@/components/gallery/types";
import {
  hasReacted,
  reactorSummaryLabel,
  REACTION_EMOJIS,
  totalReactionCount,
} from "@/lib/reactions";
import { useReactionViewerTriggerController } from "@/lib/use-reaction-viewer-trigger";
import ReactionReactorsSheet from "./ReactionReactorsSheet";

const PRIMARY_EMOJI = REACTION_EMOJIS[0];

interface PostEngagementRowProps {
  token: string;
  postId: string;
  reactions: Reaction[];
  guestName: string;
  readOnly?: boolean;
  variant?: "light" | "dark";
  pickerPlacement?: "above" | "below";
  onReactionsChange: (updated: Reaction[]) => void;
  onCommentClick?: () => void;
}

function CommentIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

export default function PostEngagementRow({
  token,
  postId,
  reactions,
  guestName,
  readOnly = false,
  variant = "light",
  pickerPlacement = "above",
  onReactionsChange,
  onCommentClick,
}: PostEngagementRowProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHover, setPickerHover] = useState(false);
  const [reactorsOpen, setReactorsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getTriggerProps } = useReactionViewerTriggerController();
  const summaryTrigger = getTriggerProps("summary", () => setReactorsOpen(true));

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const totalCount = totalReactionCount(reactions);
  const summary = reactorSummaryLabel(reactions);
  const heartActive = hasReacted(reactions, PRIMARY_EMOJI, guestName);
  const showPicker = pickerOpen || pickerHover;

  function openPicker() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPickerHover(true);
  }

  function scheduleClosePicker() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setPickerHover(false);
      setPickerOpen(false);
    }, 120);
  }

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
      } else if (data.toggled === "removed") {
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

  function emojiPickerButtonClass(active: boolean): string {
    if (variant === "dark") {
      return `flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition-colors disabled:opacity-40 ${
        active
          ? "bg-zinc-700 ring-1 ring-zinc-500"
          : "hover:bg-zinc-700"
      }`;
    }
    return `flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition-colors disabled:opacity-40 ${
      active
        ? "bg-rose-50 ring-1 ring-rose-200"
        : "hover:bg-zinc-50"
    }`;
  }

  function heartTriggerClass(): string {
    if (variant === "dark") {
      return `relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none transition-colors disabled:opacity-40 ${
        heartActive
          ? "bg-zinc-800 text-rose-400 ring-1 ring-zinc-600 hover:bg-zinc-700"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`;
    }
    return `relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none transition-colors disabled:opacity-40 ${
      heartActive
        ? "bg-rose-50 text-rose-500 ring-1 ring-rose-200 hover:bg-rose-100"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
    }`;
  }

  function commentButtonClass(): string {
    if (variant === "dark") {
      return "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200";
    }
    return "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700";
  }

  function summaryClass(): string {
    if (variant === "dark") {
      return "min-w-0 max-w-[55%] shrink truncate text-right text-xs font-medium text-zinc-400 touch-none transition-transform hover:text-zinc-200";
    }
    return "min-w-0 max-w-[55%] shrink truncate text-right text-xs font-medium text-zinc-500 touch-none transition-transform";
  }

  function pickerPositionClass(): string {
    if (pickerPlacement === "below") {
      return "absolute top-full left-0 z-30 pt-1.5";
    }
    return "absolute bottom-full left-0 z-20 pb-1.5";
  }

  function pickerMenuClass(): string {
    if (variant === "dark") {
      return "flex items-center gap-0.5 rounded-full border border-zinc-600 bg-zinc-800 p-1 shadow-xl";
    }
    return "flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-1 shadow-lg";
  }

  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-0.5">
          <div
            className="relative"
            onMouseEnter={openPicker}
            onMouseLeave={scheduleClosePicker}
          >
            {readOnly ? (
              <span className={heartTriggerClass()} aria-hidden="true">
                {PRIMARY_EMOJI}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => toggle(PRIMARY_EMOJI)}
                disabled={loading === PRIMARY_EMOJI}
                aria-label={`React with ${PRIMARY_EMOJI}`}
                aria-pressed={heartActive}
                aria-expanded={showPicker}
                className={heartTriggerClass()}
              >
                {PRIMARY_EMOJI}
              </button>
            )}

            {!readOnly && showPicker && (
              <div
                className={pickerPositionClass()}
                onMouseEnter={openPicker}
                onMouseLeave={scheduleClosePicker}
              >
                <div
                  role="menu"
                  className={pickerMenuClass()}
                >
                  {REACTION_EMOJIS.map((emoji) => {
                    const active = hasReacted(reactions, emoji, guestName);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        role="menuitem"
                        onClick={() => toggle(emoji)}
                        disabled={loading === emoji}
                        aria-label={`React with ${emoji}`}
                        aria-pressed={active}
                        className={emojiPickerButtonClass(active)}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!readOnly && (
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-200 bg-white text-[10px] font-bold text-zinc-500 shadow-sm hover:text-zinc-800 md:hidden"
                aria-label="More reactions"
                aria-expanded={pickerOpen}
              >
                +
              </button>
            )}
          </div>

          {onCommentClick && (
            <button
              type="button"
              onClick={onCommentClick}
              aria-label={readOnly ? "View comments" : "Add a comment"}
              className={commentButtonClass()}
            >
              <CommentIcon />
            </button>
          )}
        </div>

        {totalCount > 0 && summary ? (
          <button
            type="button"
            {...summaryTrigger.triggerProps}
            className={`${summaryClass()} ${summaryTrigger.pressClass}`}
            title={summary}
            aria-label={`View all ${totalCount} reactions`}
            aria-haspopup="dialog"
          >
            {summary}
          </button>
        ) : null}
      </div>

      <ReactionReactorsSheet
        open={reactorsOpen}
        onClose={() => setReactorsOpen(false)}
        reactions={reactions}
      />
    </>
  );
}
