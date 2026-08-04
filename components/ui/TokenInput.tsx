"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredGuestName, notifyGuestNameSet } from "@/lib/guest-storage";

export function TokenInput() {
  const [code, setCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = guestName.trim();
    if (trimmedCode.length < 4 || !trimmedName) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/event-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, guestName: trimmedName }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          redirect: string;
          guestName: string;
          eventId: string;
        };
        setStoredGuestName(data.eventId, data.guestName);
        notifyGuestNameSet(data.eventId, data.guestName);
        router.push(data.redirect);
        return;
      }

      if (res.status === 403) {
        const body = (await res.json()) as { error?: string };
        setError(
          body.error ??
            "This event requires a personal invite code. Use the form above."
        );
        return;
      }

      if (trimmedCode.length === 8) {
        const viewRes = await fetch(
          `/api/events/lookup?code=${encodeURIComponent(trimmedCode)}`
        );
        if (viewRes.ok) {
          const { redirect } = (await viewRes.json()) as { redirect: string };
          router.push(redirect);
          return;
        }
      }

      setError("That code wasn't found. Please check and try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter event code"
        maxLength={12}
        className="form-field-lg-mono w-full"
        autoComplete="off"
        spellCheck={false}
      />
      <input
        type="text"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Your name"
        maxLength={100}
        className="form-field-lg w-full text-sm"
        autoComplete="name"
      />
      {error && (
        <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={
          code.trim().length < 4 || !guestName.trim() || loading
        }
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Signing in…" : "Go to Event →"}
      </button>
      <p className="text-[11px] text-zinc-400 text-center leading-snug">
        Event codes let anyone with the code join. View-only 8-char codes also
        work here (name optional for view-only).
      </p>
    </form>
  );
}
