interface UploadStickyBarProps {
  visible: boolean;
  caption?: string;
  onChangeCaption?: (value: string) => void;
  captionPlaceholder?: string;
  showCaption?: boolean;
  ctaLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  disabled?: boolean;
}

export default function UploadStickyBar({
  visible,
  caption,
  onChangeCaption,
  captionPlaceholder = "Add a caption (optional)",
  showCaption = true,
  ctaLabel,
  onSubmit,
  submitting = false,
  disabled = false,
}: UploadStickyBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:static md:mt-4 md:rounded-xl md:border md:shadow-sm">
      <div className="mx-auto max-w-2xl space-y-3">
        {showCaption && onChangeCaption !== undefined && (
          <input
            type="text"
            value={caption ?? ""}
            onChange={(e) => onChangeCaption(e.target.value)}
            placeholder={captionPlaceholder}
            maxLength={500}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400"
          />
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || submitting}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Posting…" : ctaLabel}
        </button>
      </div>
    </div>
  );
}
