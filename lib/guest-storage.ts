export function guestNameKey(eventId: string) {
  return `guestName:${eventId}`;
}

export function getStoredGuestName(eventId: string): string | null {
  try {
    return localStorage.getItem(guestNameKey(eventId));
  } catch {
    return null;
  }
}

export function setStoredGuestName(eventId: string, name: string): boolean {
  try {
    localStorage.setItem(guestNameKey(eventId), name);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredGuestName(eventId: string): void {
  try {
    localStorage.removeItem(guestNameKey(eventId));
  } catch {
    // ignore
  }
}

export function notifyGuestNameSet(eventId: string, name: string) {
  window.dispatchEvent(
    new CustomEvent("guestNameSet", { detail: { eventId, name } })
  );
}

export function notifyGuestNameCleared(eventId: string) {
  window.dispatchEvent(
    new CustomEvent("guestNameCleared", { detail: { eventId } })
  );
}
