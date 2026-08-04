interface TextMemoryTabProps {
  textMemory: string;
  onChangeTextMemory: (value: string) => void;
}

export default function TextMemoryTab({
  textMemory,
  onChangeTextMemory,
}: TextMemoryTabProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <textarea
        value={textMemory}
        onChange={(e) => onChangeTextMemory(e.target.value)}
        placeholder="Share a written memory, toast, or story…"
        rows={8}
        maxLength={500}
        className="w-full resize-none border-0 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
      />
      <div className="mt-2 flex justify-end">
        <span className="text-xs text-zinc-400">
          {textMemory.length}/500
        </span>
      </div>
    </div>
  );
}
