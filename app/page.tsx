import Link from "next/link";
import { InviteLogin } from "@/components/ui/InviteLogin";
import { TokenInput } from "@/components/ui/TokenInput";
import { HostLogoutButton } from "@/components/ui/HostLogoutButton";
import { isHostAccessConfigured } from "@/lib/host-access-config";
import { readHostAccess } from "@/lib/host-access";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hasInvalidToken = error === "invalid-token";
  const configured = isHostAccessConfigured();
  const hostSession = configured ? await readHostAccess() : null;
  const isHostAuthenticated = hostSession !== null;

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900">📸 Photo Album</h1>
          <p className="mt-2 text-zinc-500 text-sm">
            Private photo sharing for your events.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 flex flex-col gap-4">
          <p className="text-sm font-medium text-zinc-700 text-center">
            Have an invite code?
          </p>

          {hasInvalidToken && (
            <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
              Please sign in with your invite code to continue.
            </p>
          )}

          <InviteLogin />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <p className="text-sm font-medium text-zinc-700 text-center">
            Have an event code?
          </p>
          <TokenInput />
        </div>

        {(isHostAuthenticated || configured) && (
          <>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-xs text-zinc-400">or</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            {isHostAuthenticated ? (
              <div className="w-full flex flex-col items-center gap-2">
                <Link
                  href="/create"
                  className="w-full text-center rounded-xl border border-zinc-200 bg-white py-3 px-6 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  Create an Event
                </Link>
                <HostLogoutButton />
              </div>
            ) : (
              <Link
                href="/host/login"
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                Host login →
              </Link>
            )}
          </>
        )}

        {!configured && (
          <Link
            href="/host/login?error=not-configured"
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Host login
          </Link>
        )}
      </div>
    </main>
  );
}
