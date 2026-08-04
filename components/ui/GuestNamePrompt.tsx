"use client";

import { useState } from "react";
import {
  notifyGuestNameSet,
  setStoredGuestName,
} from "@/lib/guest-storage";
import { useGuestName } from "@/lib/use-guest-name";

interface GuestNamePromptProps {
  token: string;
  eventId: string;
  onNameSet?: (name: string) => void;
}

export default function GuestNamePrompt({
  token,
  eventId,
  onNameSet,
}: GuestNamePromptProps) {
  const storedName = useGuestName(eventId);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (storedName) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, eventId }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setStoredGuestName(eventId, name);
      notifyGuestNameSet(eventId, name);
      onNameSet?.(name);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-zinc-900">
          What&apos;s your name?
        </h2>
        <p className="mb-6 text-sm text-zinc-500">
          Your name will appear on photos and videos you upload.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            autoFocus
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
