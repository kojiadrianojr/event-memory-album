import type { Reaction } from "@/components/gallery/types";

export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👏"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactorGroup {
  emoji: string;
  guestNames: string[];
}

export interface GuestReactorSummary {
  guestName: string;
  emojis: string[];
}

export interface EmojiTab {
  emoji: string;
  count: number;
}

export function countFor(reactions: Reaction[], emoji: string): number {
  return reactions.filter((r) => r.emoji === emoji).length;
}

export function hasReacted(
  reactions: Reaction[],
  emoji: string,
  guestName: string
): boolean {
  return reactions.some((r) => r.emoji === emoji && r.guestName === guestName);
}

export function totalReactionCount(reactions: Reaction[]): number {
  return reactions.length;
}

export function uniqueReactorNames(reactions: Reaction[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const reaction of reactions) {
    if (!seen.has(reaction.guestName)) {
      seen.add(reaction.guestName);
      names.push(reaction.guestName);
    }
  }
  return names;
}

export function reactorSummaryLabel(
  reactions: Reaction[],
  maxNames = 2
): string {
  const names = uniqueReactorNames(reactions);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const shown = names.slice(0, maxNames).join(", ");
  const remaining = names.length - maxNames;
  return `${shown} and ${remaining} other${remaining === 1 ? "" : "s"}`;
}

export function groupReactors(
  reactions: Reaction[],
  filterEmoji?: string
): ReactorGroup[] {
  const filtered = filterEmoji
    ? reactions.filter((r) => r.emoji === filterEmoji)
    : reactions;

  const byEmoji = new Map<string, string[]>();

  for (const reaction of filtered) {
    const names = byEmoji.get(reaction.emoji) ?? [];
    if (!names.includes(reaction.guestName)) {
      names.push(reaction.guestName);
    }
    byEmoji.set(reaction.emoji, names);
  }

  const emojiOrder = filterEmoji
    ? [filterEmoji]
    : REACTION_EMOJIS.filter((emoji) => byEmoji.has(emoji));

  return emojiOrder.map((emoji) => ({
    emoji,
    guestNames: byEmoji.get(emoji) ?? [],
  }));
}

export function groupReactorsByGuest(
  reactions: Reaction[]
): GuestReactorSummary[] {
  const byGuest = new Map<string, string[]>();

  for (const reaction of reactions) {
    const emojis = byGuest.get(reaction.guestName) ?? [];
    if (!emojis.includes(reaction.emoji)) {
      emojis.push(reaction.emoji);
    }
    byGuest.set(reaction.guestName, emojis);
  }

  const order = uniqueReactorNames(reactions);
  return order.map((guestName) => ({
    guestName,
    emojis: REACTION_EMOJIS.filter((emoji) =>
      (byGuest.get(guestName) ?? []).includes(emoji)
    ),
  }));
}

export function emojiTabsWithCounts(reactions: Reaction[]): EmojiTab[] {
  return REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: countFor(reactions, emoji),
  })).filter((tab) => tab.count > 0);
}
