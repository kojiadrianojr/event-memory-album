"use client";

import { useMemo, useState } from "react";
import { Reaction } from "@/components/gallery/types";
import {
  emojiTabsWithCounts,
  groupReactors,
  groupReactorsByGuest,
  totalReactionCount,
  uniqueReactorNames,
} from "@/lib/reactions";
import GuestAvatar from "@/components/ui/GuestAvatar";
import BottomSheet from "@/components/ui/BottomSheet";

type ReactionTab = "ALL" | string;

interface ReactionReactorsSheetProps {
  open: boolean;
  onClose: () => void;
  reactions: Reaction[];
  filterEmoji?: string;
}

export default function ReactionReactorsSheet({
  open,
  onClose,
  reactions,
  filterEmoji,
}: ReactionReactorsSheetProps) {
  const [activeTab, setActiveTab] = useState<ReactionTab>(filterEmoji ?? "ALL");

  const emojiTabs = useMemo(() => emojiTabsWithCounts(reactions), [reactions]);
  const guestSummaries = useMemo(
    () => groupReactorsByGuest(reactions),
    [reactions]
  );
  const totalCount = totalReactionCount(reactions);
  const guestCount = uniqueReactorNames(reactions).length;

  const activeEmoji = activeTab === "ALL" ? undefined : activeTab;
  const emojiGroups = useMemo(
    () => groupReactors(reactions, activeEmoji),
    [reactions, activeEmoji]
  );

  const listCount =
    activeTab === "ALL"
      ? guestSummaries.length
      : emojiGroups.reduce((sum, group) => sum + group.guestNames.length, 0);

  if (!open || totalCount === 0) return null;

  const title =
    activeTab === "ALL"
      ? `Reactions · ${guestCount}`
      : `${activeTab} · ${listCount}`;

  function tabButtonClass(selected: boolean): string {
    return `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      selected
        ? "bg-zinc-900 text-white"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
    }`;
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div
        role="tablist"
        aria-label="Reaction filters"
        className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ALL"}
          onClick={() => setActiveTab("ALL")}
          className={tabButtonClass(activeTab === "ALL")}
        >
          All {guestCount}
        </button>
        {emojiTabs.map(({ emoji, count }) => (
          <button
            key={emoji}
            type="button"
            role="tab"
            aria-selected={activeTab === emoji}
            onClick={() => setActiveTab(emoji)}
            className={tabButtonClass(activeTab === emoji)}
          >
            {emoji} {count}
          </button>
        ))}
      </div>

      <div className="max-h-[50dvh] overflow-y-auto" role="tabpanel">
        {activeTab === "ALL" ? (
          <ul className="flex flex-col gap-3">
            {guestSummaries.map((guest) => (
              <li
                key={guest.guestName}
                className="flex min-w-0 items-center gap-3"
              >
                <GuestAvatar name={guest.guestName} size="sm" />
                <span
                  className="min-w-0 flex-1 truncate text-sm text-zinc-800"
                  title={guest.guestName}
                >
                  {guest.guestName}
                </span>
                <span
                  className="flex shrink-0 items-center gap-0.5 text-base leading-none"
                  aria-label={guest.emojis.join(", ")}
                >
                  {guest.emojis.map((emoji) => (
                    <span key={emoji} aria-hidden="true">
                      {emoji}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-3">
            {emojiGroups.flatMap((group) =>
              group.guestNames.map((guestName) => (
                <li
                  key={`${group.emoji}-${guestName}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <GuestAvatar name={guestName} size="sm" />
                  <span
                    className="min-w-0 flex-1 truncate text-sm text-zinc-800"
                    title={guestName}
                  >
                    {guestName}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
