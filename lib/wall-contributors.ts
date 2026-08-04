import { db } from "@/lib/db";

export type WallContributor = {
  name: string;
  postCount: number;
};

export type WallSummary = {
  contributorCount: number;
  totalPosts: number;
};

export function aggregateContributors(
  posts: { uploaderName: string }[]
): WallContributor[] {
  const counts = posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.uploaderName] = (acc[post.uploaderName] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .filter(([, postCount]) => postCount > 0)
    .map(([name, postCount]) => ({ name, postCount }))
    .sort(
      (a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)
    );
}

export function wallSummary(contributors: WallContributor[]): WallSummary {
  return {
    contributorCount: contributors.length,
    totalPosts: contributors.reduce((total, c) => total + c.postCount, 0),
  };
}

export async function getWallData(eventId: string): Promise<{
  contributors: WallContributor[];
  summary: WallSummary;
}> {
  const groups = await db.post.groupBy({
    by: ["uploaderName"],
    where: { eventId },
    _count: { _all: true },
  });

  const contributors = groups
    .filter((group) => group._count._all > 0)
    .map((group) => ({
      name: group.uploaderName,
      postCount: group._count._all,
    }))
    .sort(
      (a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)
    );

  return {
    contributors,
    summary: wallSummary(contributors),
  };
}
