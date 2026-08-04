import UploadSuccessLinks from "./UploadSuccessLinks";

interface UploadSuccessPanelProps {
  token: string;
  message?: string;
  addAnotherLabel?: string;
  onAddAnother: () => void;
}

export default function UploadSuccessPanel({
  token,
  message = "Posted to the gallery",
  addAnotherLabel = "Add another",
  onAddAnother,
}: UploadSuccessPanelProps) {
  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm text-white"
          aria-hidden
        >
          ✓
        </span>
        <p className="text-sm font-medium text-green-800">{message}</p>
      </div>
      <UploadSuccessLinks token={token} />
      <button
        type="button"
        onClick={onAddAnother}
        className="w-full rounded-xl border border-green-300 bg-white px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-50 transition-colors"
      >
        {addAnotherLabel}
      </button>
    </div>
  );
}
