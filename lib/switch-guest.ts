import {
  clearStoredGuestName,
  notifyGuestNameCleared,
} from "@/lib/guest-storage";

export async function switchGuest(eventId: string): Promise<void> {
  clearStoredGuestName(eventId);
  notifyGuestNameCleared(eventId);
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore — cookie will still be re-validated on the next request
  }
}
