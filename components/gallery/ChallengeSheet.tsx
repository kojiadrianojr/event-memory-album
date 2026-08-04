"use client";

import Link from "next/link";
import BottomSheet from "@/components/ui/BottomSheet";
import { EventPrompt } from "@/components/gallery/types";

interface ChallengeSheetProps {
  open: boolean;
  onClose: () => void;
  token: string;
  prompts: EventPrompt[];
  promptCounts: Record<string, number>;
}

export default function ChallengeSheet({
  open,
  onClose,
  token,
  prompts,
  promptCounts,
}: ChallengeSheetProps) {
  const contributedCount = prompts.filter(
    (prompt) => (promptCounts[prompt.id] ?? 0) > 0
  ).length;
  const totalPosts = prompts.reduce(
    (sum, prompt) => sum + (promptCounts[prompt.id] ?? 0),
    0
  );
  const progressPct =
    prompts.length > 0
      ? Math.round((contributedCount / prompts.length) * 100)
      : 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Photo challenges">
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            {contributedCount} of {prompts.length} with posts
          </span>
          <span>{totalPosts} posts total</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Challenges with at least one post"
        >
          <div
            className="h-full rounded-full bg-amber-400 transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
        {prompts.map((prompt) => {
          const count = promptCounts[prompt.id] ?? 0;
          return (
            <li key={prompt.id}>
              <Link
                href={`/event/${token}/upload?promptId=${prompt.id}`}
                onClick={onClose}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-amber-200 hover:bg-amber-50/50"
              >
                <p className="text-sm text-zinc-800">{prompt.text}</p>
                <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
                  {count} {count === 1 ? "post" : "posts"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
