"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type HostAccessLoginProps = {
  nextPath: string;
};

export function HostAccessLogin({ nextPath }: HostAccessLoginProps) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/host/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      if (res.status === 503) {
        setError("Creating events is turned off right now.");
        return;
      }
      if (res.status === 401) {
        setError("Wrong password. Try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Password"
        className="form-field-lg w-full text-sm"
        autoComplete="current-password"
      />
      {error && (
        <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!secret.trim() || loading}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Signing in…" : "Continue →"}
      </button>
    </form>
  );
}
