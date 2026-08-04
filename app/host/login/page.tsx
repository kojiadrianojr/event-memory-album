import Link from "next/link";
import { HostAccessLogin } from "@/components/ui/HostAccessLogin";
import { isHostAccessConfigured } from "@/lib/host-access-config";

export default async function HostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = isHostAccessConfigured();
  const notConfigured = !configured || error === "not-configured";
  const nextPath =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/create";

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Host login</h1>
          <p className="mt-2 text-zinc-500 text-sm">
            {notConfigured
              ? "Authorized admins only."
              : "Enter your password to create an event."}
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 flex flex-col gap-4">
          {notConfigured ? (
            <>
              <p className="text-sm text-zinc-600 text-center leading-relaxed">
                This page is for authorized admins only. If you need to create
                an event, contact the site administrator.
              </p>
              <Link
                href="/"
                className="w-full text-center rounded-xl border border-zinc-200 bg-white py-3 px-6 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                Back to home
              </Link>
            </>
          ) : (
            <HostAccessLogin nextPath={nextPath} />
          )}
        </div>
      </div>
    </main>
  );
}
