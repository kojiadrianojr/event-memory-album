import { customAlphabet } from "nanoid";

const eventCodeAlphabet = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  6
);

/** Human-friendly per-event code guests type on the home page (6 chars). */
export function generateEventCode(): string {
  return eventCodeAlphabet();
}
