/** Short label for photo-challenge chips in the gallery. */
export function shortPromptLabel(text: string, maxLen = 28): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace > maxLen * 0.5 ? slice.slice(0, lastSpace) : slice.trimEnd();

  return `${cut}…`;
}
