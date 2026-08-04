import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateFeed } from "@/lib/cache-invalidate";
import { verifyAccessTokenForPost } from "@/lib/event-auth";
import { reactionSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, postId, emoji, guestName } = parsed.data;

  const authorized = await verifyAccessTokenForPost(token, postId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, eventId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existing = await db.reaction.findUnique({
    where: { postId_guestName_emoji: { postId, guestName, emoji } },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    await invalidateFeed(post.eventId);
    return NextResponse.json({ toggled: "removed", postId, emoji, guestName });
  }

  const reaction = await db.reaction.create({
    data: { postId, emoji, guestName },
  });

  await invalidateFeed(post.eventId);

  return NextResponse.json({ toggled: "added", ...reaction }, { status: 201 });
}
