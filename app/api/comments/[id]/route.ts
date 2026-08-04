import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateFeed } from "@/lib/cache-invalidate";
import {
  getCommentForGuestMutation,
  verifyAccessTokenForPost,
} from "@/lib/event-auth";
import { deleteCommentSchema, updateCommentSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, authorName, content } = parsed.data;

  const result = await getCommentForGuestMutation(id, authorName);
  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authorized = await verifyAccessTokenForPost(token, result.comment.postId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const comment = await db.comment.update({
    where: { id },
    data: { content },
  });

  const post = await db.post.findUnique({
    where: { id: result.comment.postId },
    select: { eventId: true },
  });
  if (post) await invalidateFeed(post.eventId);

  return NextResponse.json(comment);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, authorName } = parsed.data;

  const result = await getCommentForGuestMutation(id, authorName);
  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authorized = await verifyAccessTokenForPost(token, result.comment.postId);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await db.comment.delete({ where: { id } });

  const post = await db.post.findUnique({
    where: { id: result.comment.postId },
    select: { eventId: true },
  });
  if (post) await invalidateFeed(post.eventId);

  return new NextResponse(null, { status: 204 });
}
