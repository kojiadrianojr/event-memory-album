import type { PostItem } from "@/components/gallery/types";

function comparePosts(a: PostItem, b: PostItem): number {
  const timeDiff =
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return b.id.localeCompare(a.id);
}

export function mergeFeedPosts(
  existing: PostItem[],
  incoming: PostItem[]
): { merged: PostItem[]; newCount: number } {
  if (incoming.length === 0) {
    return { merged: existing, newCount: 0 };
  }

  const existingIds = new Set(existing.map((post) => post.id));
  const newPosts = incoming.filter((post) => !existingIds.has(post.id));
  const newCount = newPosts.length;

  if (newCount === 0) {
    return { merged: existing, newCount: 0 };
  }

  const merged = [...existing, ...newPosts].sort(comparePosts);
  return { merged, newCount };
}
