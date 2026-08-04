"use client";

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

export default function ChallengeHeaderButton() {
  const { hasPrompts, bannerDismissed, bannerHydrated, openSheet, prompts } =
    useChallenges();

  if (!bannerHydrated || !hasPrompts || !bannerDismissed) return null;

  const countLabel =
    prompts.length === 1 ? "1 challenge" : `${prompts.length} challenges`;

  return (
    <button
      type="button"
      onClick={openSheet}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 py-1 pl-1 pr-2.5 shadow-sm ring-1 ring-amber-200/60 transition-colors hover:border-amber-400 hover:bg-amber-100 active:bg-amber-100"
      title={`Photo challenges (${prompts.length})`}
      aria-label={`Photo challenges, ${countLabel}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
        <ChallengeCameraIcon className="h-4 w-4 text-amber-800" />
      </span>
      <span className="hidden text-xs font-semibold text-amber-950 sm:inline">
        Challenges
      </span>
      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-amber-950">
        {prompts.length}
      </span>
    </button>
  );
}
