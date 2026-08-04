/**
 * Sanitizes an event name into a filesystem/URL-safe ZIP filename stem,
 * e.g. "Alex & Sam's Wedding!" -> "alex-sam-s-wedding".
 */
export function safeExportFilename(eventName: string): string {
  return eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}
