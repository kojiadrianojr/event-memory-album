"use client";

import { useMemo } from "react";
import { useChallenges } from "@/components/gallery/ChallengesContext";

function ChallengeCameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h4l1.5-2h5L16 8h4a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

export default function PhotoChallengesBanner() {
  const {
    prompts,
    promptCounts,
    hasPrompts,
    bannerDismissed,
    bannerHydrated,
    dismissBanner,
    openSheet,
  } = useChallenges();

  const totalPosts = useMemo(
    () =>
      prompts.reduce(
        (sum, prompt) => sum + (promptCounts[prompt.id] ?? 0),
        0
      ),
    [prompts, promptCounts]
  );

  if (!bannerHydrated || !hasPrompts || bannerDismissed) return null;

  const challengeLabel =
    prompts.length === 1 ? "1 photo challenge" : `${prompts.length} photo challenges`;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 pr-1">
      <button
        type="button"
        onClick={openSheet}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-amber-100/60 rounded-l-xl"
      >
        <ChallengeCameraIcon className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-amber-900">
          {challengeLabel}
          {totalPosts > 0 && (
            <span className="font-normal text-amber-700/90">
              {" "}
              · {totalPosts} posts
            </span>
          )}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={dismissBanner}
        className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800"
        aria-label="Dismiss photo challenges banner"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
