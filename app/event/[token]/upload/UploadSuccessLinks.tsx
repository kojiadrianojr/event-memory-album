import Link from "next/link";

export default function UploadSuccessLinks({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link
        href={`/event/${token}?mine=1`}
        className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        View my uploads
      </Link>
      <Link
        href={`/event/${token}`}
        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        Back to gallery
      </Link>
    </div>
  );
}
