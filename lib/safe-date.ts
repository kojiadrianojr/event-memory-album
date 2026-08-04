import { format, isValid, parseISO } from "date-fns";

export function safeParseISO(dateStr: string): Date | null {
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function safeFormatDate(
  dateStr: string,
  pattern: string,
  fallback = ""
): string {
  const parsed = safeParseISO(dateStr);
  if (!parsed) return fallback;
  try {
    return format(parsed, pattern);
  } catch {
    return fallback;
  }
}
