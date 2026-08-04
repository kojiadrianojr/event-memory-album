import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getPostForGuestMutation,
  verifyAccessTokenForPost,
  verifyAdminForEvent,
} from "@/lib/event-auth";
import { deletePostAndStorage, postInclude } from "@/lib/post-helpers";
import { deletePostSchema, updatePostSchema } from "@/lib/validations";

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

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, uploaderName, caption, momentId } = parsed.data;

  const authorized = await verifyAccessTokenForPost(token, id);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await getPostForGuestMutation(id, uploaderName);
  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { post } = result;
  const isTextPost = post.media.some((m) => m.type === "TEXT");

  const nextCaption =
    caption !== undefined ? caption.trim() || null : post.caption;

  if (isTextPost && !nextCaption) {
    return NextResponse.json(
      { error: "caption is required for text memories" },
      { status: 400 }
    );
  }

  if (momentId) {
    const moment = await db.eventMoment.findFirst({
      where: { id: momentId, eventId: post.eventId },
    });
    if (!moment) {
      return NextResponse.json({ error: "Moment not found" }, { status: 400 });
    }
  }

  const data: { caption?: string | null; momentId?: string | null } = {};
  if (caption !== undefined) data.caption = nextCaption;
  if (momentId !== undefined) data.momentId = momentId;

  const updated = await db.post.update({
    where: { id },
    data,
    include: postInclude,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminToken = request.headers.get("x-admin-token");

  if (adminToken) {
    const post = await db.post.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const authorized = await verifyAdminForEvent(adminToken, post.eventId);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deletePostAndStorage(post);
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deletePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, uploaderName } = parsed.data;

  const authorized = await verifyAccessTokenForPost(token, id);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await getPostForGuestMutation(id, uploaderName);
  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deletePostAndStorage(result.post);
  return new NextResponse(null, { status: 204 });
}
