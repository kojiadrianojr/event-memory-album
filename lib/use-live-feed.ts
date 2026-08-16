"use client";

import { useEffect, useRef, useState } from "react";

/** Cadence for the cheap version probe. */
const LIVE_VERSION_POLL_MS = 5_000;
/** Cadence used when the server has no Redis version counter to probe. */
const FALLBACK_POLL_MS = 30_000;
/** Hard ceiling on a probe, so it always settles inside one tick. */
const VERSION_FETCH_TIMEOUT_MS = 4_000;

type LiveMode = "probing" | "fallback";

interface UseLiveFeedOptions {
  token: string;
  enabled?: boolean;
  /** Called when the feed has changed server-side and should be refetched. */
  onChanged: () => void;
}

/**
 * Watches the event's Redis feed-version counter and calls `onChanged` whenever
 * it moves, so the client refetches the feed only when something actually
 * changed. When the server reports `live: false` (no Redis, counter frozen at
 * 0), this degrades to firing on a plain interval instead.
 *
 * Ticks are skipped while the tab is hidden; becoming visible triggers an
 * immediate check.
 */
export function useLiveFeed({
  token,
  enabled = true,
  onChanged,
}: UseLiveFeedOptions) {
  const [mode, setMode] = useState<LiveMode>("probing");
  const lastVersionRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const onChangedRef = useRef(onChanged);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function check() {
      if (cancelled || inFlightRef.current) return;
      if (document.visibilityState !== "visible") return;

      // No counter to probe — refetch on the fallback cadence instead.
      if (mode === "fallback") {
        onChangedRef.current();
        return;
      }

      inFlightRef.current = true;
      try {
        // Always bounded: a request frozen with a backgrounded tab would
        // otherwise leave the in-flight guard latched and stop polling for good.
        const res = await fetch(`/api/events/${token}/feed-version`, {
          cache: "no-store",
          signal: AbortSignal.timeout(VERSION_FETCH_TIMEOUT_MS),
        });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as { version: number; live: boolean };
        if (cancelled) return;

        if (!data.live) {
          setMode("fallback");
          return;
        }

        if (data.version !== lastVersionRef.current) {
          lastVersionRef.current = data.version;
          onChangedRef.current();
        }
      } catch {
        // best-effort — keep the interval alive and retry on the next tick
      } finally {
        inFlightRef.current = false;
      }
    }

    const interval = mode === "fallback" ? FALLBACK_POLL_MS : LIVE_VERSION_POLL_MS;
    const timer = setInterval(() => void check(), interval);

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      // A tab frozen mid-request can resume with the guard still set; the
      // request it belonged to is gone, so clear it before checking again.
      inFlightRef.current = false;
      void check();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, enabled, mode]);
}
