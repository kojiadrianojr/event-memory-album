export function challengesBannerDismissedKey(eventId: string): string {
  return `challengesBannerDismissed:${eventId}`;
}

export function isChallengesBannerDismissed(eventId: string): boolean {
  try {
    return (
      localStorage.getItem(challengesBannerDismissedKey(eventId)) === "1"
    );
  } catch {
    return false;
  }
}

export function setChallengesBannerDismissed(eventId: string): void {
  try {
    localStorage.setItem(challengesBannerDismissedKey(eventId), "1");
  } catch {
    // ignore
  }
}
