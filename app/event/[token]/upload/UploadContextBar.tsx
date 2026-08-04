import { EventMoment, EventPrompt } from "@/components/gallery/types";

interface UploadContextBarProps {
  moments: EventMoment[];
  selectedMomentId: string;
  onSelectMoment: (momentId: string) => void;
  activePrompt: EventPrompt | null;
  onClearPrompt: () => void;
}

export default function UploadContextBar({
  moments,
  selectedMomentId,
  onSelectMoment,
  activePrompt,
  onClearPrompt,
}: UploadContextBarProps) {
  const hasMoments = moments.length > 0;
  if (!hasMoments && !activePrompt) return null;

  return (
    <div className="space-y-3">
      {activePrompt && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Photo challenge
            </p>
            <p className="mt-0.5 text-sm text-amber-900">{activePrompt.text}</p>
          </div>
          <button
            type="button"
            onClick={onClearPrompt}
            className="shrink-0 text-xs font-medium text-amber-800 underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}

      {hasMoments && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Moment
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectMoment("")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedMomentId === ""
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              General
            </button>
            {moments.map((moment) => (
              <button
                key={moment.id}
                type="button"
                onClick={() => onSelectMoment(moment.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedMomentId === moment.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {moment.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
