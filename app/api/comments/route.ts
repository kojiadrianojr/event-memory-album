import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateFeed } from "@/lib/cache-invalidate";
import { verifyAccessTokenForPost } from "@/lib/event-auth";
import { commentSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const token = searchParams.get("token");

  if (!postId || !token) {
    return NextResponse.json(
      { error: "postId and token query params are required" },
      { status: 400 }
    );
  }

  const authorized = await verifyAccessTokenForPost(token, postId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, postId, content, authorName } = parsed.data;

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

  const comment = await db.comment.create({
    data: { postId, content, authorName },
  });

  await invalidateFeed(post.eventId);

  return NextResponse.json(comment, { status: 201 });
}
