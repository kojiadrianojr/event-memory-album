interface UploadErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function UploadErrorBanner({
  message,
  onRetry,
  retryLabel = "Try again",
}: UploadErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
    >
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-medium text-red-800 underline hover:no-underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
