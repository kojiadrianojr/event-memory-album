"use client";

import { useSyncExternalStore } from "react";
import { getStoredGuestName, guestNameKey } from "@/lib/guest-storage";

function subscribeGuestName(eventId: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function onStorage(e: StorageEvent) {
    if (e.key === guestNameKey(eventId)) onStoreChange();
  }
  function onGuestNameSet(e: Event) {
    const { eventId: id } = (
      e as CustomEvent<{ eventId: string; name: string }>
    ).detail;
    if (id === eventId) onStoreChange();
  }
  function onGuestNameCleared(e: Event) {
    const { eventId: id } = (e as CustomEvent<{ eventId: string }>).detail;
    if (id === eventId) onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("guestNameSet", onGuestNameSet);
  window.addEventListener("guestNameCleared", onGuestNameCleared);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("guestNameSet", onGuestNameSet);
    window.removeEventListener("guestNameCleared", onGuestNameCleared);
  };
}

/** SSR-safe guest name from localStorage (server snapshot is always null). */
export function useGuestName(eventId: string): string | null {
  return useSyncExternalStore(
    (cb) => subscribeGuestName(eventId, cb),
    () => getStoredGuestName(eventId),
    () => null
  );
}
