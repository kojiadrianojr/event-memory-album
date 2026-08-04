import Link from "next/link";
import GuestAvatar from "@/components/ui/GuestAvatar";

interface UploaderFilterBarProps {
  name: string;
  label: string;
  clearHref: string;
}

export default function UploaderFilterBar({
  name,
  label,
  clearHref,
}: UploaderFilterBarProps) {
  const isOwnUploads = label === "My uploads";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5">
      <GuestAvatar name={name} size="sm" />
      <p className="min-w-0 flex-1 truncate text-sm leading-snug text-zinc-600">
        Viewing{" "}
        <span className="font-medium text-zinc-900">
          {isOwnUploads ? "your uploads" : label.toLowerCase()}
        </span>
      </p>
      <Link
        href={clearHref}
        className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
      >
        Show all
      </Link>
    </div>
  );
}
